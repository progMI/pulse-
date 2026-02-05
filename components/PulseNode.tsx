
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Message } from '../types';

interface PulseNodeProps {
  message: Message;
  isSelected: boolean;
  onClick: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete?: () => void;
}

const PulseNode: React.FC<PulseNodeProps> = ({ message, isSelected, onClick, onMove, onDelete }) => {
  const { vibe, position, reactions, isClosed } = message;
  const [isDragging, setIsDragging] = useState(false);
  const [isReadyToMove, setIsReadyToMove] = useState(false);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const shapeClass = useMemo(() => {
    switch (vibe.shape) {
      case 'star': return 'clip-path-star';
      case 'diamond': return 'rotate-45';
      case 'blob': return 'clip-path-blob';
      default: return 'rounded-full';
    }
  }, [vibe.shape]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { x: position.x, y: position.y };

    longPressTimer.current = window.setTimeout(() => {
      setIsReadyToMove(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 300); // Чуть быстрее для отзывчивости
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (longPressTimer.current && !isReadyToMove) {
        const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.current.x, 2) + Math.pow(e.clientY - dragStartPos.current.y, 2));
        if (dist > 5) { // Минимальный порог сдвига
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      if (!isReadyToMove) return;

      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

      animationFrameId.current = requestAnimationFrame(() => {
        if (!isDragging) setIsDragging(true);

        const dx = ((e.clientX - dragStartPos.current.x) / window.innerWidth) * 100;
        const dy = ((e.clientY - dragStartPos.current.y) / window.innerHeight) * 100;
        
        const newX = Math.max(5, Math.min(95, nodeStartPos.current.x + dx));
        const newY = Math.max(10, Math.min(85, nodeStartPos.current.y + dy));
        
        onMove(message.id, newX, newY);
      });
    };

    const handleMouseUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      setIsDragging(false);
      setIsReadyToMove(false);
    };

    if (isReadyToMove) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isReadyToMove, isDragging, message.id, onMove]);

  return (
    <div
      ref={nodeRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging && !isReadyToMove) onClick();
      }}
      className={`absolute transition-all duration-300 group select-none
        ${isClosed ? 'opacity-20 grayscale hover:opacity-100 hover:grayscale-0' : 'opacity-100'}
        ${isDragging ? 'cursor-grabbing scale-110' : isReadyToMove ? 'cursor-grab scale-105' : 'cursor-pointer hover:scale-105'}
      `}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%)`,
        zIndex: isSelected || isDragging ? 60 : 10,
        willChange: 'left, top, transform'
      }}
    >
      <div 
        className={isReadyToMove && !isDragging ? 'animate-pulse' : ''}
        style={{ 
          animation: isDragging ? 'none' : `float-gentle ${isClosed ? 10 : 4 + Math.random() * 2}s infinite ease-in-out` 
        }}
      >
        {!isClosed && reactions && Object.entries(reactions).map(([emoji, count], idx) => (
          <div key={emoji} className="absolute pointer-events-none" style={{ top: `${Math.sin(idx * 1.2) * 45}px`, left: `${Math.cos(idx * 1.2) * 45}px` }}>
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10 shadow-lg scale-75">
              <span className="text-xs">{emoji}</span>
              <span className="text-[10px] font-bold opacity-70">{count}</span>
            </div>
          </div>
        ))}

        <div 
          className={`absolute inset-0 blur-3xl transition-all duration-700 ${isReadyToMove ? 'opacity-50 scale-150' : isClosed ? 'opacity-0' : 'opacity-20'}`}
          style={{ backgroundColor: vibe.hue, transform: `scale(${vibe.size * (isSelected || isReadyToMove ? 1.5 : 1.2)})` }} 
        />

        <div 
          className={`relative w-14 h-14 flex items-center justify-center transition-all duration-500 ${shapeClass} ${isSelected || isReadyToMove ? 'ring-2 ring-white/50 z-20 shadow-2xl scale-110' : 'shadow-lg'} ${isDragging ? 'brightness-125' : ''} ${isClosed ? 'scale-75 blur-[1px]' : ''}`}
          style={{ backgroundColor: vibe.hue, boxShadow: isClosed ? 'none' : `0 0 20px ${vibe.hue}66` }}
        >
          <span className={`text-2xl transform transition-transform duration-300 ${isClosed ? 'opacity-50' : 'opacity-100'}`}>{isClosed ? '⌛' : vibe.emoji}</span>
          {isClosed && isSelected && (
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="absolute -top-4 -right-4 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
          )}
        </div>

        <div className={`absolute top-full mt-8 left-1/2 -translate-x-1/2 px-4 py-1.5 glass rounded-full whitespace-nowrap text-[10px] tracking-widest uppercase transition-all duration-500 transform
          ${isSelected || isReadyToMove ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
          <span className="opacity-80">{isClosed && isSelected ? 'Удалить?' : isClosed ? 'Архив' : isReadyToMove && !isDragging ? 'Перемещение...' : message.text.substring(0, 15) + (message.text.length > 15 ? '...' : '')}</span>
        </div>
      </div>
    </div>
  );
};

export default PulseNode;
