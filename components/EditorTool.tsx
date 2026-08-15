import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { fileToBase64, editImage, generateImage, generateVideo } from '../services/geminiService';
import { navigateTo } from '../services/config';
import { getActiveProviderId } from '../services/providers';
import { saveAsset, urlToBlob } from '../services/library';
import Spinner from './Spinner';
import LoadingOverlay from './LoadingOverlay';

const saveToLibrary = async (
  type: 'image' | 'video',
  url: string,
  prompt: string,
  fallbackMime: string
) => {
  try {
    const blob = await urlToBlob(url);
    const model = getActiveProviderId();
    await saveAsset({ type, mime: blob.type || fallbackMime, data: blob, prompt, model });
  } catch { /* library save is best-effort */ }
};

enum EditorTab {
  EDIT = 'EDIT',
  GENERATE = 'GENERATE'
}

// --- Child Components ---

interface ImageUploaderProps {
  onImageUpload: (file: ImageFile) => void;
  sourceImage: ImageFile | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, sourceImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      try {
        const base64 = await fileToBase64(file);
        onImageUpload({
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
          url: URL.createObjectURL(file),
        });
      } catch (error) {
        console.error("Error processing file:", error);
        // Optionally, inform the user about the error
      }
    }
  };

  const dragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const dragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const fileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2 text-left">Upload your product photo</label>
      <div 
        onDragOver={dragOver}
        onDragLeave={dragLeave}
        onDrop={fileDrop}
        className={`relative flex justify-center items-center w-full h-64 px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-blue-400' : 'border-gray-600'} border-dashed rounded-md transition-colors`}
      >
        {sourceImage ? (
          <img src={sourceImage.url} alt="Uploaded preview" className="max-h-full max-w-full object-contain rounded-md" />
        ) : (
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex text-sm text-gray-400">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-blue-500">
                <span>Upload a file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EditorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>(EditorTab.EDIT);
  const [prompt, setPrompt] = useState<string>('');
  const [sourceImage, setSourceImage] = useState<ImageFile | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [hasApiKey, setHasApiKey] = useState(true);

  const resetState = useCallback((keepSource = false) => {
    setPrompt('');
    if (!keepSource) {
      setSourceImage(null);
      setGeneratedContent(null);
    }
    setVideoUrl(null);
    setIsLoading(false);
    setError(null);
    setLoadingMessage('');
  }, []);

  const handleTabChange = (tab: EditorTab) => {
    resetState();
    setActiveTab(tab);
  };

  const handleImageUpload = (file: ImageFile) => {
    setSourceImage(file);
    setGeneratedContent(file.url); 
    setVideoUrl(null);
    setError(null);
  }
  
  const updateSourceImageFromUrl = async (imageUrl: string, fileName: string, mimeType: string) => {
      const file = await fetch(imageUrl).then(r => r.blob()).then(blobFile => new File([blobFile], fileName, { type: mimeType }));
      const base64 = await fileToBase64(file);
       setSourceImage({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        url: imageUrl,
      });
  }

  const handleImageGeneration = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating your masterpiece...');
    setError(null);
    setGeneratedContent(null);
    setVideoUrl(null);
    try {
      const imageUrl = await generateImage(prompt);
      setGeneratedContent(imageUrl);
      await updateSourceImageFromUrl(imageUrl, "generated.jpg", "image/jpeg");
      saveToLibrary('image', imageUrl, prompt, 'image/jpeg');
    } catch (e: any) {
      setError(e.message || 'An error occurred during image generation.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleImageEdit = async () => {
    if (!prompt) {
      setError('Please enter an editing instruction.');
      return;
    }
    if (!sourceImage) {
      setError('Please upload an image to edit.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Applying your edits...');
    setError(null);
    setGeneratedContent(null);
    setVideoUrl(null);

    try {
      const imageUrl = await editImage(sourceImage, prompt);
      setGeneratedContent(imageUrl);
      await updateSourceImageFromUrl(imageUrl, "edited.png", "image/png");
      saveToLibrary('image', imageUrl, prompt, 'image/png');
    } catch (e: any) {
      setError(e.message || 'An error occurred while editing the image.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleVideoGeneration = async () => {
    if (!prompt) {
      setError('Please enter a prompt for the video.');
      return;
    }
    if (!sourceImage) {
      setError('Please upload or generate an image first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setHasApiKey(true);

    try {
      const generatedVideoUrl = await generateVideo(sourceImage, prompt, setLoadingMessage);
      setVideoUrl(generatedVideoUrl);
      saveToLibrary('video', generatedVideoUrl, prompt, 'video/mp4');
    } catch (e: any) {
      if (e.message === 'API_KEY_REQUIRED') {
        setHasApiKey(false);
        setError('An API Key is required for video generation.');
      } else if (e.message === 'API_KEY_INVALID') {
        setHasApiKey(false);
        setError('The selected API Key is invalid or missing permissions.');
      } else {
        setError(e.message || 'An unexpected error occurred during video generation.');
      }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };
  
  const handleSubmit = () => {
    if (activeTab === EditorTab.GENERATE) {
      handleImageGeneration();
    } else {
      handleImageEdit();
    }
  };

  const handleSelectApiKey = () => {
    setHasApiKey(true);
    setError(null);
    navigateTo('SETTINGS');
  }

  const renderContent = () => {
    if (activeTab === EditorTab.EDIT) {
      return <ImageUploader onImageUpload={handleImageUpload} sourceImage={sourceImage}/>;
    }
    return (
        <div className="w-full text-center p-8 bg-gray-800/50 rounded-lg h-64 flex flex-col justify-center">
            <h3 className="text-lg font-medium text-gray-300">Start with a prompt</h3>
            <p className="text-sm text-gray-500 mt-1">Describe the image you want to create.</p>
        </div>
    );
  };
  
  const isSubmitDisabled = isLoading || !prompt || (activeTab === EditorTab.EDIT && !sourceImage);
  const isVideoDisabled = isLoading || !prompt || !sourceImage;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full justify-center text-center p-4 md:p-8 animate-fade-in-fast">
      <div className="relative w-full bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="md:w-1/2 flex flex-col space-y-4">
          <div className="flex w-full bg-gray-900/50 p-1 rounded-lg">
            <button onClick={() => handleTabChange(EditorTab.EDIT)} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === EditorTab.EDIT ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Edit</button>
            <button onClick={() => handleTabChange(EditorTab.GENERATE)} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === EditorTab.GENERATE ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Generate</button>
          </div>

          {renderContent()}
          
          <div className="w-full">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2 text-left">
              {activeTab === EditorTab.EDIT ? 'What would you like to change?' : 'Describe your vision'}
            </label>
            <textarea
              id="prompt"
              rows={3}
              className="w-full bg-gray-900/70 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder={activeTab === EditorTab.EDIT ? "e.g., 'Make the background a futuristic city'" : "e.g., 'A majestic lion wearing a crown'"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
             <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="w-full sm:w-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-full text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              {isLoading && (activeTab === EditorTab.EDIT ? loadingMessage.startsWith('Applying') : loadingMessage.startsWith('Generating')) ? 'Working...' : activeTab === EditorTab.EDIT ? 'Edit Image' : 'Generate Image'}
            </button>
             <button
                onClick={handleVideoGeneration}
                disabled={isVideoDisabled}
                className="w-full sm:w-1/2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-4 rounded-full text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              {isLoading && loadingMessage.includes('video') ? 'Creating...' : 'Create Video'}
            </button>
          </div>

        </div>

        <div className="md:w-1/2 flex items-center justify-center bg-black/30 rounded-lg aspect-[9/16] md:aspect-auto">
          <div className="relative w-full h-full">
             {isLoading && <LoadingOverlay message={loadingMessage} />}
            
            {error && !hasApiKey && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-20 rounded-lg p-4">
                <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-white text-lg font-medium text-center mb-1">{error}</p>
                <p className="text-gray-400 text-sm text-center mb-4">Video generation with Veo requires a user-selected API key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Learn about billing.</a></p>
                <button
                    onClick={handleSelectApiKey}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full text-base hover:bg-blue-700 active:scale-95 transition-all"
                >
                    Select API Key
                </button>
              </div>
            )}
             
            {error && hasApiKey && <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10 rounded-lg"><p className="text-red-400 text-center p-4">{error}</p></div>}
            
            {!isLoading && !generatedContent && !videoUrl && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Your creation will appear here</p>
                </div>
            )}
            
            {videoUrl && (
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-lg"/>
            )}

            {!videoUrl && generatedContent && (
              <img src={generatedContent} alt="Generated content" className="w-full h-full object-contain rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorTool;