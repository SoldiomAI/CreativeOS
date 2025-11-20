import React from 'react';
import Spinner from './Spinner';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20 rounded-2xl">
      <Spinner className="w-16 h-16 mb-4" />
      <p className="text-white text-lg font-medium text-center px-4">{message}</p>
    </div>
  );
};

export default LoadingOverlay;
