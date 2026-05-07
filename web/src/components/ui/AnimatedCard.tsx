import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
}

export function AnimatedCard({ 
  children, 
  className = '', 
  glowColor = 'rgba(59, 130, 246, 0.3)',
  enableTilt = true 
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / (rect.height / 2)) * -5;
    const rotateY = (mouseX / (rect.width / 2)) * 5;
    
    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      animate={{
        rotateX: transform.rotateX,
        rotateY: transform.rotateY,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-px rounded-xl opacity-0 blur-xl transition-opacity"
        style={{ background: glowColor }}
        animate={{ opacity: isHovered ? 0.5 : 0 }}
      />
      
      {/* Card content */}
      <div className="relative glass-card rounded-xl overflow-hidden">
        {children}
      </div>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  href?: string;
}

export function FeatureCard({ icon, title, description, color, href }: FeatureCardProps) {
  return (
    <AnimatedCard className="h-full" glowColor={`${color}40`}>
      <a 
        href={href || '#'} 
        className="block p-6 h-full group"
      >
        <div className="flex items-start gap-4">
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}
          >
            <div style={{ color }}>
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
        
        {/* Hover indicator */}
        <div className="mt-4 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
          <span>了解更多</span>
          <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
    </AnimatedCard>
  );
}

export default AnimatedCard;
