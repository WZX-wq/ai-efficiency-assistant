import { useRef, useState, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlowButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
  enableMagnetic?: boolean;
}

export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  glowColor,
  enableMagnetic = true,
  className = '',
  ...props
}: GlowButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!enableMagnetic || !buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    gradient: 'bg-gradient-to-r from-primary-600 to-violet-600 text-white',
  };

  const defaultGlowColors = {
    primary: 'rgba(37, 99, 235, 0.5)',
    secondary: 'rgba(156, 163, 175, 0.3)',
    ghost: 'rgba(156, 163, 175, 0.2)',
    gradient: 'rgba(139, 92, 246, 0.5)',
  };

  return (
    <motion.button
      ref={buttonRef}
      className={`
        relative inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: position.x,
        y: position.y,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
      }}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-px rounded-lg blur-lg"
        style={{ background: glowColor || defaultGlowColors[variant] }}
        animate={{ opacity: isHovered ? 0.6 : 0 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

interface GradientButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  gradient?: string;
}

export function GradientButton({ 
  children, 
  gradient = 'from-primary-500 via-violet-500 to-primary-500',
  className = '',
  ...props 
}: GradientButtonProps) {
  return (
    <motion.button
      className={`
        relative inline-flex items-center justify-center
        px-6 py-3 text-base font-semibold text-white
        rounded-xl overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Animated gradient background */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${gradient} animate-gradient`}
        style={{ backgroundSize: '200% 100%' }}
      />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 shimmer" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

export default GlowButton;
