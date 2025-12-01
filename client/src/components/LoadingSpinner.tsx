import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  text = "Đang tải...",
  fullScreen = false,
}) => {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-12 h-12",
    large: "w-16 h-16",
  };

  const textSizes = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in gpu-accelerated">
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-red-600 rounded-full animate-rotate gpu-accelerated`}
      ></div>
      {text && (
        <p
          className={`text-gray-600 ${textSizes[size]} font-medium animate-pulse`}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        {content}
      </div>
    );
  }

  return <div className="py-8">{content}</div>;
};

export default LoadingSpinner;
