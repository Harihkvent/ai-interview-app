import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = 'python' }) => {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-[#2d2d2d] shadow-2xl min-h-[400px]">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        </div>
        <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
      </div>
      <div className="p-4 overflow-auto max-h-[600px]">
        <Editor
          value={code}
          onValueChange={onChange}
          highlight={(code) => highlight(code, languages[language] || languages.javascript, language)}
          padding={10}
          className="font-mono text-sm focus:outline-none"
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            minHeight: '350px'
          }}
        />
      </div>
    </div>
  );
};
