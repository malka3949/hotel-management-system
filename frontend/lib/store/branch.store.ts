import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '../api/branches';

interface BranchState {
  selectedBranchId: string;
  branches: Branch[];
  setBranches: (branches: Branch[]) => void;
  selectBranch: (id: string) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: '',
      branches: [],
      setBranches: (branches) => set({ branches }),
      selectBranch: (id) => set({ selectedBranchId: id }),
    }),
    {
      name: 'branch-selection',
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    },
  ),
);
