'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Quiz from '@/components/Quiz';

// Dynamic imports for Konva to avoid SSR issues
let Stage: any, Layer: any, Text: any, Image: any, Line: any, Rect: any, Group: any, Transformer: any;
let Konva: any;

if (typeof window !== 'undefined') {
  // Only import Konva on client-side
  const konvaModule = require('react-konva');
  Stage = konvaModule.Stage;
  Layer = konvaModule.Layer;
  Text = konvaModule.Text;
  Image = konvaModule.Image;
  Line = konvaModule.Line;
  Rect = konvaModule.Rect;
  Group = konvaModule.Group;
  Transformer = konvaModule.Transformer;
  Konva = require('konva');
}

export type ToolType = 'select' | 'text' | 'image' | 'draw' | 'highlight';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'drawing' | 'highlight';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  content?: string;
  imageUrl?: string;
  points?: number[];
  color?: string;
  fontSize?: number;
  fontFamily?: string;
}

interface CanvasProps {
  storyData?: any;
  universe?: string;
  onQuizRegenerate?: (index: number) => (newQuiz: any) => void;
}

export default function Canvas({ storyData, universe, onQuizRegenerate }: CanvasProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [tool, setTool] = useState<ToolType>('select');
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState(24);
  const [drawColor, setDrawColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const isDragging = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateSize = () => {
      setStageSize({
        width: window.innerWidth - 80,
        height: window.innerHeight - 64, // Header height
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !Konva) return;
    
    if (transformerRef.current && selectedId) {
      const selectedNode = layerRef.current?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, isMounted]);

  // Load images for story content
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !storyData?.story) return;
    
    storyData.story.forEach((paragraph: any) => {
      if (paragraph.imageUrl && !imageCache.has(paragraph.imageUrl)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // DEBUG: Log image dimensions and aspect ratio
          const aspectRatio = img.width / img.height;
          const expectedRatio = 16/9; // ~1.778
          console.log(`🖼️ Image loaded: ${img.width}x${img.height}, aspect ratio: ${aspectRatio.toFixed(3)}, expected: ${expectedRatio.toFixed(3)}`);
          if (Math.abs(aspectRatio - expectedRatio) > 0.01) {
            console.warn(`⚠️ Image aspect ratio mismatch! Expected 16:9 (${expectedRatio.toFixed(3)}), got ${aspectRatio.toFixed(3)}`);
          }
          setImageCache((prev) => new Map(prev).set(paragraph.imageUrl, img));
        };
        img.src = paragraph.imageUrl;
      }
    });
  }, [storyData, imageCache, isMounted]);

  // Pan functionality with zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate mouse position relative to stage
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Zoom in/out
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.2, Math.min(3, newScale));

    // Update scale and position to keep mouse point fixed
    setStageScale(clampedScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  // Get pointer position relative to stage (accounting for transform)
  const getStagePointerPosition = useCallback((stage: any) => {
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    
    // Account for stage position and scale
    const stagePos = stage.position();
    const stageScale = stage.scaleX();
    
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    };
  }, []);

  // Pan with mouse drag
  const handleMouseDown = useCallback((e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Don't start drawing/adding if clicking on an existing element
    if (e.target !== stage && e.target.getParent() !== stage) {
      return;
    }
    
    if (tool === 'select' && (e.evt.button === 1 || e.evt.ctrlKey || e.evt.metaKey)) {
      // Middle mouse button or Ctrl/Cmd + drag for panning
      isDragging.current = true;
    } else if (tool === 'draw') {
      const point = getStagePointerPosition(stage);
      if (!point) return;
      setIsDrawing(true);
      setDrawingPoints([point.x, point.y]);
    } else if (tool === 'text') {
      const point = getStagePointerPosition(stage);
      if (!point) return;
      
      const newText: CanvasElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: point.x,
        y: point.y,
        content: 'Yeni Metin',
        fontSize,
        fontFamily: 'Kalam, cursive',
        color: drawColor,
      };
      setElements([...elements, newText]);
      setSelectedId(newText.id);
      setTool('select');
    }
  }, [tool, elements, fontSize, drawColor, getStagePointerPosition]);

  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    if (isDragging.current) {
      const newPos = {
        x: stage.x() + e.evt.movementX,
        y: stage.y() + e.evt.movementY,
      };
      setStagePosition(newPos);
    } else if (isDrawing && tool === 'draw') {
      const point = getStagePointerPosition(stage);
      if (!point) return;
      setDrawingPoints([...drawingPoints, point.x, point.y]);
    }
  }, [isDrawing, tool, drawingPoints, getStagePointerPosition]);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
    } else if (isDrawing && tool === 'draw' && drawingPoints.length > 0) {
      const newDrawing: CanvasElement = {
        id: `drawing-${Date.now()}`,
        type: 'drawing',
        x: 0,
        y: 0,
        points: [...drawingPoints],
        color: drawColor,
      };
      setElements([...elements, newDrawing]);
      setDrawingPoints([]);
      setIsDrawing(false);
    }
  }, [isDrawing, tool, drawingPoints, elements, drawColor]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const newImage: CanvasElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          x: 100,
          y: 100,
          width: img.width,
          height: img.height,
          imageUrl,
        };
        setElements([...elements, newImage]);
        setTool('select');
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }, [elements]);

  const handleTextHighlight = useCallback(() => {
    // This will be implemented with text selection
    setTool('highlight');
  }, []);

  const handleElementClick = useCallback((e: any) => {
    if (!Konva || !e?.target) return;
    
    if (tool === 'select') {
      const id = e.target.id();
      setSelectedId(id);
      // Attach transformer to selected element
      if (transformerRef.current && e.target) {
        transformerRef.current.nodes([e.target]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (tool === 'highlight') {
      // Highlight text selection
      const target = e.target;
      if (target instanceof Konva.Text) {
        // Create highlight rectangle
        const highlight: CanvasElement = {
          id: `highlight-${Date.now()}`,
          type: 'highlight',
          x: target.x(),
          y: target.y(),
          width: target.width(),
          height: target.height(),
          color: highlightColor,
        };
        setElements([...elements, highlight]);
      }
    }
  }, [tool, elements, highlightColor]);

  const handleElementDrag = useCallback((e: any) => {
    const id = e.target.id();
    const newElements = elements.map((el) => {
      if (el.id === id) {
        return {
          ...el,
          x: e.target.x(),
          y: e.target.y(),
        };
      }
      return el;
    });
    setElements(newElements);
  }, [elements]);

  const handleElementTransform = useCallback((e: any) => {
    const id = e.target.id();
    const node = e.target;
    const newElements = elements.map((el) => {
      if (el.id === id) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
          rotation: node.rotation(),
        };
      }
      return el;
    });
    setElements(newElements);
    node.scaleX(1);
    node.scaleY(1);
  }, [elements]);

  if (!isMounted || typeof window === 'undefined' || !Stage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600" style={{ fontFamily: '"Kalam", cursive' }}>
            Canvas yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sol Toolbar - Elle çizilmiş görünüm */}
      <div className="w-20 bg-white border-r-3 border-gray-800 flex flex-col items-center py-4 gap-4 shadow-lg z-30" style={{ boxShadow: '3px 0px 5px rgba(0,0,0,0.1)' }}>
        {/* Select Tool - Elle çizilmiş */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTool('select')}
          className={`w-14 h-14 flex items-center justify-center ${
            tool === 'select' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-800 hover:border-gray-900'
          }`}
          style={{
            border: '3px solid',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(-0.5deg)',
            boxShadow: tool === 'select' ? '3px 3px 0px rgba(0,0,0,0.3)' : '2px 2px 0px rgba(0,0,0,0.2)'
          }}
          title="Seç"
        >
          <span className="text-2xl">👆</span>
        </motion.button>

        {/* Text Tool - Elle çizilmiş */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTool('text')}
          className={`w-14 h-14 flex items-center justify-center ${
            tool === 'text' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-800 hover:border-gray-900'
          }`}
          style={{
            border: '3px solid',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(0.5deg)',
            boxShadow: tool === 'text' ? '3px 3px 0px rgba(0,0,0,0.3)' : '2px 2px 0px rgba(0,0,0,0.2)'
          }}
          title="Metin Ekle"
        >
          <span className="text-2xl">📝</span>
        </motion.button>

        {/* Image Tool - Elle çizilmiş */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: -1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = handleImageUpload as any;
            input.click();
          }}
          className={`w-14 h-14 flex items-center justify-center ${
            tool === 'image' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-800 hover:border-gray-900'
          }`}
          style={{
            border: '3px solid',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(-0.3deg)',
            boxShadow: tool === 'image' ? '3px 3px 0px rgba(0,0,0,0.3)' : '2px 2px 0px rgba(0,0,0,0.2)'
          }}
          title="Resim Ekle"
        >
          <span className="text-2xl">🖼️</span>
        </motion.button>

        {/* Draw Tool - Elle çizilmiş */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTool('draw')}
          className={`w-14 h-14 flex items-center justify-center ${
            tool === 'draw' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-800 hover:border-gray-900'
          }`}
          style={{
            border: '3px solid',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(0.3deg)',
            boxShadow: tool === 'draw' ? '3px 3px 0px rgba(0,0,0,0.3)' : '2px 2px 0px rgba(0,0,0,0.2)'
          }}
          title="Çiz"
        >
          <span className="text-2xl">✏️</span>
        </motion.button>

        {/* Highlight Tool - Elle çizilmiş */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: -1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTool('highlight')}
          className={`w-14 h-14 flex items-center justify-center ${
            tool === 'highlight' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-800 hover:border-gray-900'
          }`}
          style={{
            border: '3px solid',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(-0.5deg)',
            boxShadow: tool === 'highlight' ? '3px 3px 0px rgba(0,0,0,0.3)' : '2px 2px 0px rgba(0,0,0,0.2)'
          }}
          title="Fosforlu Kalem"
        >
          <span className="text-2xl">🖍️</span>
        </motion.button>

        {/* Divider - Elle çizilmiş */}
        <div className="w-12 border-t-3 border-gray-800 my-2" style={{ transform: 'rotate(-0.5deg)' }} />

        {/* Font Size */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs text-gray-600" style={{ fontFamily: '"Kalam", cursive' }}>
            Boyut
          </label>
          <input
            type="range"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-12"
          />
          <span className="text-xs text-gray-700">{fontSize}px</span>
        </div>

        {/* Color Picker */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs text-gray-600" style={{ fontFamily: '"Kalam", cursive' }}>
            Renk
          </label>
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            className="w-12 h-12 rounded border-2 border-gray-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Canvas Area - Notebook background */}
      <div 
        id="canvas-area"
        className="flex-1 relative overflow-hidden" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundColor: '#FFFFFF',
          position: 'relative'
        }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          draggable={false}
        >
          <Layer ref={layerRef}>
            {/* Story Content - Notebook style */}
            {storyData?.story?.map((paragraph: any, index: number) => {
              const yPos = index * 800 + 100;
              const hasImage = paragraph.imagePrompt && paragraph.imagePrompt !== null && paragraph.imageUrl;
              const hasQuiz = paragraph.quiz;
              
              // Debug: Check if paragraph text exists
              if (index === 0 && !paragraph.paragraph) {
                console.warn('⚠️ Paragraph text is missing for index', index, paragraph);
              }
              
              return (
                <Group key={`story-${index}`} y={yPos}>
                  {/* Image - Match actual image size, with tape effect */}
                  {hasImage && imageCache.get(paragraph.imageUrl) && (() => {
                    const img = imageCache.get(paragraph.imageUrl)!;
                    // Use actual image dimensions to maintain aspect ratio
                    const imgAspectRatio = img.width / img.height;
                    const displayWidth = 800;
                    // Calculate height based on actual image aspect ratio
                    const displayHeight = displayWidth / imgAspectRatio;
                    
                    return (
                      <Group y={0} x={50}>
                        {/* Şeffaf bant efekti - üstten */}
                        <Group y={-15} x={displayWidth * 0.2}>
                          <Rect
                            x={0}
                            y={0}
                            width={displayWidth * 0.6}
                            height={30}
                            fill="rgba(255, 255, 255, 0.85)"
                            cornerRadius={2}
                            shadowBlur={5}
                            shadowColor="rgba(0,0,0,0.2)"
                            shadowOffsetY={2}
                            opacity={0.9}
                          />
                          {/* Bant çizgileri */}
                          <Line
                            points={[0, 10, displayWidth * 0.6, 10]}
                            stroke="rgba(200, 200, 200, 0.5)"
                            strokeWidth={1}
                            dash={[5, 5]}
                          />
                          <Line
                            points={[0, 20, displayWidth * 0.6, 20]}
                            stroke="rgba(200, 200, 200, 0.5)"
                            strokeWidth={1}
                            dash={[5, 5]}
                          />
                        </Group>
                        
                        {/* Resim - 16:9 aspect ratio */}
                        <Image
                          x={0}
                          y={0}
                          width={displayWidth}
                          height={displayHeight}
                          image={img}
                          shadowBlur={10}
                          shadowColor="rgba(0,0,0,0.2)"
                          cornerRadius={8}
                        />
                      </Group>
                    );
                  })()}

                  {/* Paragraph background - Konva Rect */}
                  <Group y={hasImage && imageCache.get(paragraph.imageUrl) ? (() => {
                    // Use actual image aspect ratio for positioning
                    const img = imageCache.get(paragraph.imageUrl)!;
                    const imgAspectRatio = img.width / img.height;
                    const displayHeight = 800 / imgAspectRatio;
                    return displayHeight + 30;
                  })() : 0} x={50}>
                    <Rect
                      x={0}
                      y={0}
                      width={800}
                      height={200}
                      fill="rgba(255,255,255,0.5)"
                      cornerRadius={8}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                  </Group>

                </Group>
              );
            })}

            {/* User Added Elements */}
            {elements.map((element) => {
              if (element.type === 'text') {
                return (
                  <Text
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    text={element.content || ''}
                    fontSize={element.fontSize || 24}
                    fontFamily={element.fontFamily || 'Kalam, cursive'}
                    fill={element.color || '#000000'}
                    draggable={tool === 'select'}
                    onClick={handleElementClick}
                    onDragEnd={handleElementDrag}
                    onTransformEnd={handleElementTransform}
                    onDblClick={(e: any) => {
                      const textNode = e.target;
                      const text = prompt('Metni düzenle:', textNode.text());
                      if (text !== null) {
                        const newElements = elements.map((el) =>
                          el.id === element.id ? { ...el, content: text } : el
                        );
                        setElements(newElements);
                      }
                    }}
                  />
                );
              } else if (element.type === 'image' && element.imageUrl) {
                let img = imageCache.get(element.imageUrl);
                if (!img && element.imageUrl) {
                  img = new window.Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    setImageCache((prev) => new Map(prev).set(element.imageUrl!, img!));
                  };
                  img.src = element.imageUrl;
                }
                if (!img) return null;
                return (
                  <Image
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    image={img}
                    draggable={tool === 'select'}
                    onClick={handleElementClick}
                    onDragEnd={handleElementDrag}
                    onTransformEnd={handleElementTransform}
                  />
                );
              } else if (element.type === 'highlight') {
                return (
                  <Rect
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    fill={element.color || highlightColor}
                    opacity={0.3}
                    draggable={tool === 'select'}
                    onClick={handleElementClick}
                    onDragEnd={handleElementDrag}
                    onTransformEnd={handleElementTransform}
                  />
                );
              } else if (element.type === 'drawing' && element.points) {
                return (
                  <Line
                    key={element.id}
                    id={element.id}
                    points={element.points}
                    stroke={element.color || '#000000'}
                    strokeWidth={fontSize / 4}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    draggable={tool === 'select'}
                    onClick={handleElementClick}
                    onDragEnd={handleElementDrag}
                  />
                );
              }
              return null;
            })}

            {/* Current Drawing */}
            {isDrawing && drawingPoints.length > 0 && (
              <Line
                points={drawingPoints}
                stroke={drawColor}
                strokeWidth={fontSize / 4}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Transformer for selected elements */}
            {tool === 'select' && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox: any, newBox: any) => {
                  // Limit minimum size
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
            
          </Layer>
        </Stage>
        
        {/* Paragraph Text Overlays - HTML text to avoid rasterization */}
        {storyData?.story?.map((paragraph: any, index: number) => {
          const groupY = index * 800 + 100;
          const hasImage = paragraph.imagePrompt && paragraph.imagePrompt !== null && paragraph.imageUrl;
          
          // Calculate paragraph position - use actual image aspect ratio
          const paragraphY = hasImage && imageCache.get(paragraph.imageUrl) ? (() => {
            // Use actual image aspect ratio for positioning
            const img = imageCache.get(paragraph.imageUrl)!;
            const imgAspectRatio = img.width / img.height;
            const displayHeight = 800 / imgAspectRatio;
            return displayHeight + 30;
          })() : 0;
          
          const canvasParagraphY = groupY + paragraphY;
          const canvasParagraphX = 50;
          
          // Apply stage transform
          const screenX = (canvasParagraphX * stageScale) + stagePosition.x;
          const screenY = (canvasParagraphY * stageScale) + stagePosition.y;
          
          return (
            <div
              key={`paragraph-overlay-${index}`}
              style={{
                position: 'absolute',
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${800 * stageScale}px`,
                transform: `scale(${stageScale})`,
                transformOrigin: '0 0',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                transform: `scale(${1 / stageScale})`,
                transformOrigin: '0 0',
                width: '800px',
                padding: '30px 20px',
                fontFamily: "'Kalam', cursive",
                fontSize: '18px',
                lineHeight: '1.6',
                color: '#1f2937',
                textAlign: 'left',
                fontWeight: '400',
                letterSpacing: '0.02em',
              }}>
                {paragraph.paragraph}
              </div>
            </div>
          );
        })}
        
        {/* Quiz Overlays - Using actual Quiz component */}
        {storyData?.story?.map((paragraph: any, index: number) => {
          if (!paragraph.quiz) return null;
          
          // Calculate positions matching canvas layout
          const groupY = index * 800 + 100;
          const hasImage = paragraph.imagePrompt && paragraph.imagePrompt !== null && paragraph.imageUrl;
          
          // CRITICAL FIX: Canvas layout analysis
          // In Canvas: <Group key="story-{index}" y={yPos}>
          //   - yPos = index * 800 + 100
          //   - Image Group (if exists): y=0, x=50, height=450
          //   - Paragraph Group: y={hasImage ? 480 : 0}, x=50
          //     - Inside Paragraph Group: Rect at y=0, height=200
          //     - So Paragraph Group ENDS at y={hasImage ? 480 : 0} + 200
          
          // Absolute canvas coordinates:
          // - Main Group starts at: groupY (e.g., 100)
          // - Paragraph Group starts at: groupY + (hasImage ? 480 : 0)
          // - Paragraph Group ENDS at: groupY + (hasImage ? 480 : 0) + 200
          // - Quiz should be at: paragraph end + spacing
          
          // Calculate paragraph start position - use actual image aspect ratio
          const paragraphStartInMainGroup = hasImage && imageCache.get(paragraph.imageUrl) ? (() => {
            // Use actual image aspect ratio for positioning
            const img = imageCache.get(paragraph.imageUrl)!;
            const imgAspectRatio = img.width / img.height;
            const displayHeight = 800 / imgAspectRatio;
            return displayHeight + 30; // spacing after image
          })() : 0;
          const paragraphHeight = 200;
          const spacing = 240; // Large spacing to ensure quiz stays below paragraph
          
          // Quiz Y in absolute canvas coordinates
          const canvasQuizY = groupY + paragraphStartInMainGroup + paragraphHeight + spacing;
          const canvasQuizX = 50;
          
          // Apply stage transform
          const screenX = (canvasQuizX * stageScale) + stagePosition.x;
          const screenY = (canvasQuizY * stageScale) + stagePosition.y;
          
          
          return (
            <div
              key={`quiz-overlay-${index}`}
              style={{
                position: 'absolute',
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: '800px',
                transform: `scale(${stageScale})`,
                transformOrigin: '0 0',
                zIndex: 1000,
                pointerEvents: 'auto',
              }}
            >
              <Quiz
                quiz={paragraph.quiz}
                concept={paragraph.paragraph.substring(0, 100)}
                universe={universe}
                onRegenerate={onQuizRegenerate ? onQuizRegenerate(index) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

