'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

/** Board / region selection — 'en' = American board, 'zh' = Chinese board */
export type Board = 'en' | 'zh';

interface BoardContextType {
  board:    Board;
  setBoard: (b: Board) => void;
}

const BoardContext = createContext<BoardContextType>({
  board:    'en',
  setBoard: () => {},
});

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board>('en');

  return (
    <BoardContext.Provider value={{ board, setBoard }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardContextType {
  return useContext(BoardContext);
}
