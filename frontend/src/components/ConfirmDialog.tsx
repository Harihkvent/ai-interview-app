import React, { useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return 'bg-[var(--error)] hover:bg-[var(--error)]/90';
            case 'warning':
                return 'bg-[var(--warning)] hover:bg-[var(--warning)]/90';
            case 'info':
                return 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]';
            default:
                return 'bg-[var(--error)] hover:bg-[var(--error)]/90';
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
            onClick={onCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-slide-in"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                {/* Title */}
                <h3
                    id="dialog-title"
                    className="text-xl font-semibold text-[var(--text-primary)] mb-3"
                >
                    {title}
                </h3>

                {/* Message */}
                <p
                    id="dialog-description"
                    className="text-[var(--text-secondary)] mb-6 leading-relaxed"
                >
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg font-medium transition-all duration-200 hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)] focus:ring-offset-2"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 text-white rounded-lg font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 ${getVariantStyles()}`}
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook for easier usage
export const useConfirmDialog = () => {
    const [dialogState, setDialogState] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: 'danger' | 'warning' | 'info';
        resolver?: (value: boolean) => void;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const confirm = (
        title: string,
        message: string,
        options?: {
            confirmLabel?: string;
            cancelLabel?: string;
            variant?: 'danger' | 'warning' | 'info';
        }
    ): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                confirmLabel: options?.confirmLabel,
                cancelLabel: options?.cancelLabel,
                variant: options?.variant,
                resolver: resolve
            });
        });
    };

    const handleConfirm = () => {
        dialogState.resolver?.(true);
        setDialogState({ ...dialogState, isOpen: false });
    };

    const handleCancel = () => {
        dialogState.resolver?.(false);
        setDialogState({ ...dialogState, isOpen: false });
    };

    const ConfirmDialogComponent = () => (
        <ConfirmDialog
            isOpen={dialogState.isOpen}
            title={dialogState.title}
            message={dialogState.message}
            confirmLabel={dialogState.confirmLabel}
            cancelLabel={dialogState.cancelLabel}
            variant={dialogState.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );

    return { confirm, ConfirmDialogComponent };
};
