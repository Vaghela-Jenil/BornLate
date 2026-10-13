'use client'
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface LoaderProps {
  /** Size of the loader */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to show as full screen overlay */
  fullScreen?: boolean;
  /** Loading text to display */
  text?: string;
  /** Additional className for custom styling */
  className?: string;
}

export default function Loader({ 
  size = "md", 
  fullScreen = false, 
  text = "Loading...",
  className = "" 
}: LoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  const LoaderContent = () => (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Animated spinner */}
      <div className="relative">
        <Loader2 
          className={`${sizeClasses[size]} text-primary animate-spin`}
        />
        
        {/* Pulse ring around spinner */}
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-primary/20`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Loading text with fade animation */}
      {text && (
        <motion.p 
          className={`${textSizeClasses[size]} text-muted-foreground font-medium`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}

      {/* Animated dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 rounded-full bg-primary/40"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <LoaderContent />
        </motion.div>
      </motion.div>
    );
  }

  return <LoaderContent />;
}

// Skeleton loader for content placeholders
export function SkeletonLoader({ 
  lines = 3, 
  className = "" 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className="h-4 bg-muted rounded animate-pulse"
          style={{ 
            width: `${Math.random() * 40 + 60}%` 
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.1
          }}
        />
      ))}
    </div>
  );
}

// Spinner-only loader for buttons
export function SpinnerLoader({ 
  size = "sm",
  className = ""
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  return (
    <Loader2 
      className={`${sizeClasses[size]} animate-spin ${className}`}
    />
  );
}