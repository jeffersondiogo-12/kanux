"use client";
import { Suspense } from 'react';
import ChatsPageContent from './ChatsPageContent';

export default function ChatsPage(){
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Carregando...</div>}>
      <ChatsPageContent />
    </Suspense>
  );
}
