'use client';

import { AddVideoModal, AddVideoModalProps } from './AddVideoModal';

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToAddModal?: () => void;
  onGenerate?: AddVideoModalProps['onGenerate'];
}

export function SearchModal({ isOpen, onClose, onGenerate }: SearchModalProps) {
  return (
    <AddVideoModal
      isOpen={isOpen}
      onClose={onClose}
      onGenerate={onGenerate || (() => {})}
    />
  );
}
