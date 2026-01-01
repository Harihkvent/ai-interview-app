from typing import Any, AsyncIterator, Dict, Optional, Sequence
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
import pickle
import logging

logger = logging.getLogger("ai_engine")

class MongoCheckpointSaver(BaseCheckpointSaver):
    """
    MongoDB implementation of LangGraph CheckpointSaver.
    Persists agent state to MongoDB 'checkpoints' collection.
    """
    client: AsyncIOMotorClient
    db_name: str
    collection_name: str

    def __init__(self, client: AsyncIOMotorClient, db_name: str, collection_name: str = "checkpoints"):
        super().__init__()
        self.client = client
        self.db_name = db_name
        self.collection_name = collection_name
        self.collection = self.client[self.db_name][self.collection_name]

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Optional[Dict[str, Any]] = None,
    ) -> RunnableConfig:
        """Save a checkpoint to MongoDB."""
        thread_id = config["configurable"]["thread_id"]
        
        # Serialize checkpoint using pickle (as it contains complex objects)
        # In prod, consider JSON serialization if possible, but pickle is standard for LangGraph demo
        checkpoint_blob = pickle.dumps(checkpoint)
        metadata_blob = pickle.dumps(metadata)

        doc = {
            "thread_id": thread_id,
            "checkpoint": checkpoint_blob,
            "metadata": metadata_blob,
            "version": checkpoint["id"], # Typically a timestamp or UUID
            "latest": True
        }

        # 1. Unset 'latest' flag for previous checkpoint of this thread
        await self.collection.update_many(
            {"thread_id": thread_id, "latest": True},
            {"$set": {"latest": False}}
        )

        # 2. Insert new checkpoint
        await self.collection.insert_one(doc)
        
        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_id": checkpoint["id"],
            }
        }

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """Get a checkpoint tuple from MongoDB."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id")

        query = {"thread_id": thread_id}
        if checkpoint_id:
            query["version"] = checkpoint_id
        else:
            query["latest"] = True

        doc = await self.collection.find_one(query, sort=[("version", -1)])
        
        if not doc:
            return None

        checkpoint = pickle.loads(doc["checkpoint"])
        metadata = pickle.loads(doc["metadata"])
        
        # Determine parent config if needed (simplified)
        parent_config = None 
        
        return CheckpointTuple(config, checkpoint, metadata, parent_config)

    async def alist(
        self,
        config: RunnableConfig,
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        """List checkpoints."""
        # Simplified implementation for now
        thread_id = config["configurable"]["thread_id"]
        cursor = self.collection.find({"thread_id": thread_id}).sort("version", -1)
        
        if limit:
            cursor = cursor.limit(limit)

        async for doc in cursor:
            checkpoint = pickle.loads(doc["checkpoint"])
            metadata = pickle.loads(doc["metadata"])
            yield CheckpointTuple(config, checkpoint, metadata, None)
