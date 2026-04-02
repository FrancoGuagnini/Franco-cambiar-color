/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from "@google/genai";
import { Upload, Palette, Image as ImageIcon, Sparkles, Loader2, X, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ImageFile {
  file: File;
  preview: string;
}

export default function App() {
  const [mainImage, setMainImage] = useState<ImageFile | null>(null);
  const [refImage, setRefImage] = useState<ImageFile | null>(null);
  const [colorInput, setColorInput] = useState('');
  const [mode, setMode] = useState<'color' | 'reference'>('color');
  const [isTransforming, setIsTransforming] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDropMain = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setMainImage({
        file,
        preview: URL.createObjectURL(file)
      });
      setResultImage(null);
    }
  }, []);

  const onDropRef = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setRefImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  }, []);

  const { getRootProps: getMainProps, getInputProps: getMainInputProps, isDragActive: isMainActive } = useDropzone({
    onDrop: onDropMain,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const { getRootProps: getRefProps, getInputProps: getRefInputProps, isDragActive: isRefActive } = useDropzone({
    onDrop: onDropRef,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleTransform = async () => {
    if (!mainImage) return;
    
    setIsTransforming(true);
    setError(null);

    try {
      const mainBase64 = await fileToBase64(mainImage.file);
      
      let prompt = "";
      const parts: any[] = [
        {
          inlineData: {
            data: mainBase64,
            mimeType: mainImage.file.type
          }
        }
      ];

      if (mode === 'color') {
        if (!colorInput.trim()) {
          throw new Error("Por favor, ingresa un color o código hex.");
        }
        prompt = `Change the color of the clothes in this image to ${colorInput}. Keep the texture and lighting realistic.`;
      } else {
        if (!refImage) {
          throw new Error("Por favor, sube una imagen de referencia.");
        }
        const refBase64 = await fileToBase64(refImage.file);
        parts.push({
          inlineData: {
            data: refBase64,
            mimeType: refImage.file.type
          }
        });
        prompt = "Change the color of the clothes in the first image to match the colors and style of the second image. Ensure the result looks natural.";
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts }
      });

      let foundImage = false;
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            setResultImage(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("No se pudo generar la imagen. Intenta con una descripción más clara.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 pb-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight flex items-center gap-3">
              <Palette className="w-8 h-8 text-indigo-600" />
              Color Transformer
            </h1>
            <p className="text-muted-foreground mt-2 font-light">
              Cambia el color de la ropa usando inteligencia artificial.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            Powered by Gemini 2.5
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Uploads & Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Main Image Upload */}
            <section className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Imagen Principal
              </label>
              {!mainImage ? (
                <div
                  {...getMainProps()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[240px]",
                    isMainActive ? "border-indigo-500 bg-indigo-50/50" : "border-black/10 hover:border-black/20 bg-white"
                  )}
                >
                  <input {...getMainInputProps()} />
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Sube tu foto</p>
                    <p className="text-sm text-muted-foreground">Arrastra o haz clic aquí</p>
                  </div>
                </div>
              ) : (
                <div className="relative group rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm">
                  <img 
                    src={mainImage.preview} 
                    alt="Main" 
                    className="w-full aspect-square object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setMainImage(null)}
                    className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>

            {/* Mode Selection */}
            <section className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Elige el Color de Destino
              </label>
              <div className="flex p-1 bg-black/5 rounded-xl">
                <button
                  onClick={() => setMode('color')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                    mode === 'color' ? "bg-white shadow-sm text-indigo-600" : "text-muted-foreground hover:text-black"
                  )}
                >
                  <Palette className="w-4 h-4" />
                  Texto / Hex
                </button>
                <button
                  onClick={() => setMode('reference')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                    mode === 'reference' ? "bg-white shadow-sm text-indigo-600" : "text-muted-foreground hover:text-black"
                  )}
                >
                  <ImageIcon className="w-4 h-4" />
                  Referencia
                </button>
              </div>

              {mode === 'color' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Ej: Rojo vibrante, #FF0000, Azul marino..."
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight px-1">
                    Puedes usar nombres de colores o códigos hexadecimales.
                  </p>
                </div>
              ) : (
                <div>
                  {!refImage ? (
                    <div
                      {...getRefProps()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[160px]",
                        isRefActive ? "border-indigo-500 bg-indigo-50/50" : "border-black/10 hover:border-black/20 bg-white"
                      )}
                    >
                      <input {...getRefInputProps()} />
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Sube imagen de referencia</p>
                    </div>
                  ) : (
                    <div className="relative group rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm">
                      <img 
                        src={refImage.preview} 
                        alt="Reference" 
                        className="w-full h-32 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => setRefImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Action Button */}
            <button
              onClick={handleTransform}
              disabled={isTransforming || !mainImage || (mode === 'color' ? !colorInput : !refImage)}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20",
                isTransforming || !mainImage || (mode === 'color' ? !colorInput : !refImage)
                  ? "bg-gray-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]"
              )}
            >
              {isTransforming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transformando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Transformar
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-8 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium">Resultado</h2>
                {resultImage && (
                  <a 
                    href={resultImage} 
                    download="transformed-image.png"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Descargar
                  </a>
                )}
              </div>

              <div className="flex-1 rounded-2xl bg-[#f9f9f9] border border-black/5 overflow-hidden flex items-center justify-center relative group">
                {resultImage ? (
                  <img 
                    src={resultImage} 
                    alt="Result" 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center space-y-4 p-12">
                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-black/10">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Tu imagen aparecerá aquí</p>
                      <p className="text-xs text-muted-foreground/60">Sube una foto y presiona "Transformar"</p>
                    </div>
                  </div>
                )}

                {isTransforming && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                      <Sparkles className="w-6 h-6 text-indigo-400 absolute -top-2 -right-2 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-indigo-900">La magia está ocurriendo...</p>
                  </div>
                )}
              </div>

              {/* Comparison Hint */}
              {resultImage && mainImage && !isTransforming && (
                <div className="mt-6 flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/5 flex-shrink-0">
                    <img src={mainImage.preview} alt="Original" className="w-full h-full object-cover" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                  <div className="text-sm">
                    <span className="font-semibold text-indigo-900">¡Listo!</span>
                    <p className="text-indigo-700/70 text-xs">Hemos aplicado el nuevo color a las prendas.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer Info */}
        <footer className="pt-12 pb-8 text-center border-t border-black/5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Color Transformer &copy; 2024 &bull; Creative AI Tools
          </p>
        </footer>
      </div>
    </div>
  );
}
