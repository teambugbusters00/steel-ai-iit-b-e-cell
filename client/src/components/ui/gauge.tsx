import React, { useEffect, useState, useRef } from 'react';

interface GaugeProps {
  title: string;
  value: number;
  min?: number;
  max: number;
  unit: string;
  status?: 'normal' | 'warning' | 'critical';
  type?: 'speedometer' | 'radial';
  size?: number;
}

export function AnimatedGauge({
  title,
  value,
  min = 0,
  max,
  unit,
  status = 'normal',
  type = 'speedometer',
  size = 120
}: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(value);
  const [animatedAngle, setAnimatedAngle] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, life: number}>>([]);
  const particleIdRef = useRef(0);

  // Enhanced real-time animation with burn effects
  useEffect(() => {
    const targetAngle = ((value - min) / (max - min)) * 240 - 30;
    const startAngle = animatedAngle;
    const startValue = animatedValue;

    const duration = title === 'Temperature' ? 1200 : 800; // Longer animation for temperature "burn" effect
    const steps = title === 'Temperature' ? 60 : 40;
    const stepDuration = duration / steps;

    let currentStep = 0;

    // Create particles for temperature burn effect
    if (title === 'Temperature' && status === 'critical' && particles.length < 8) {
      const newParticles = Array.from({length: 5}, () => ({
        id: particleIdRef.current++,
        x: Math.random() * size,
        y: Math.random() * size,
        life: 1
      }));
      setParticles(prev => [...prev, ...newParticles]);
    }

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;

      // Enhanced easing for burn effect
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const dampedProgress = easeOutBack(progress);
      const overshoot = title === 'Temperature' ? (status === 'critical' ? 0.08 : 0.04) : 0.02;
      const overshootProgress = dampedProgress * (1 + overshoot * Math.sin(progress * Math.PI * 3));

      const damping = 1 - Math.pow(progress, 2);
      const finalProgress = overshootProgress * damping;

      const currentAngle = startAngle + (targetAngle - startAngle) * finalProgress;
      const currentValue = startValue + (value - startValue) * progress;

      setAnimatedAngle(currentAngle);
      setAnimatedValue(currentValue);

      // Dynamic glow effect
      const glowProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const intensity = title === 'Temperature' ?
        (status === 'critical' ? glowProgress * 1.5 : glowProgress * 0.8) :
        (status === 'critical' ? glowProgress * 0.8 : glowProgress * 0.4);
      setGlowIntensity(intensity);

      if (currentStep < steps) {
        setTimeout(animate, stepDuration);
      } else {
        setAnimatedAngle(targetAngle);
        setAnimatedValue(value);
        setGlowIntensity(title === 'Temperature' && status === 'critical' ? 0.3 : 0);
      }
    };

    animate();
  }, [value, min, max, status, title]);

  // Animate particles for burn effect
  useEffect(() => {
    if (particles.length === 0) return;

    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        life: particle.life - 0.03,
        y: particle.y - 2,
        x: particle.x + (Math.random() - 0.5) * 0.5
      })).filter(particle => particle.life > 0));
    };

    const interval = setInterval(animateParticles, 30);
    return () => clearInterval(interval);
  }, [particles.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - 30) / 2;

  // Calculate needle angle (240 degree arc from -30 to 210 degrees)
  const needleAngleRad = (animatedAngle * Math.PI) / 180;

  // Calculate needle end point
  const needleLength = radius - 8;
  const needleX = centerX + Math.cos(needleAngleRad) * needleLength;
  const needleY = centerY + Math.sin(needleAngleRad) * needleLength;

  // Create tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const angle = (i / 10) * 240 - 30;
    const angleRad = (angle * Math.PI) / 180;
    const innerRadius = radius - 8;
    const outerRadius = radius - 3;
    const x1 = centerX + Math.cos(angleRad) * innerRadius;
    const y1 = centerY + Math.sin(angleRad) * innerRadius;
    const x2 = centerX + Math.cos(angleRad) * outerRadius;
    const y2 = centerY + Math.sin(angleRad) * outerRadius;

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#666"
        strokeWidth="1"
      />
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-1 p-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 relative overflow-hidden ${
      title === 'Temperature' && status === 'critical' ? 'animate-pulse' : ''
    } ${title === 'Vibration' ? 'animate-pulse' : ''} ${
      title === 'Emissions' ? 'animate-pulse' : ''
    } ${title === 'Scrap Purity' ? 'animate-pulse' : ''} ${
      title === 'Battery Level' ? 'animate-pulse' : ''
    } ${title === 'Air Quality' ? 'animate-pulse' : ''}`}>
      {/* Background effects for different sensor types */}
      {title === 'Temperature' && (
        <div
          className="absolute inset-0 rounded-lg transition-opacity duration-300"
          style={{
            background: status === 'critical' ?
              `radial-gradient(circle, rgba(239, 68, 68, ${glowIntensity * 0.3}) 0%, transparent 70%)` :
              `radial-gradient(circle, rgba(245, 158, 11, ${glowIntensity * 0.2}) 0%, transparent 70%)`,
            opacity: glowIntensity
          }}
        />
      )}

      {title === 'Vibration' && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
      )}

      {title === 'Emissions' && (
        <div className="absolute inset-0 rounded-lg">
          <div className="absolute top-0 left-1/4 w-1 h-1 bg-gray-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0ms' }} />
          <div className="absolute top-0 left-1/2 w-1 h-1 bg-gray-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '200ms' }} />
          <div className="absolute top-0 right-1/4 w-1 h-1 bg-gray-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '400ms' }} />
        </div>
      )}

      {title === 'Scrap Purity' && (
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 animate-pulse opacity-30" />
        </div>
      )}

      {title === 'Battery Level' && (
        <div className="absolute inset-0 rounded-lg">
          <div className="absolute top-2 right-2 w-2 h-4 border-2 border-green-400 rounded-sm">
            <div className="w-full h-1 bg-green-400 rounded-sm animate-pulse mt-0.5" />
          </div>
        </div>
      )}

      {title === 'Air Quality' && (
        <div className="absolute inset-0 rounded-lg">
          <div className="absolute top-1 left-1 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-60" />
          <div className="absolute top-3 right-2 w-1 h-1 bg-blue-300 rounded-full animate-ping opacity-40" style={{ animationDelay: '500ms' }} />
          <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping opacity-50" style={{ animationDelay: '1000ms' }} />
        </div>
      )}

      <div className="text-xs font-medium text-white text-center relative z-10">{title}</div>
      <div className={`text-sm font-bold text-center relative z-10 transition-all duration-300 ${
        status === 'critical' ? 'text-red-400' :
        status === 'warning' ? 'text-yellow-400' :
        'text-green-400'
      } ${title === 'Temperature' && status === 'critical' ? 'animate-pulse' : ''} ${
        title === 'Vibration' ? 'animate-bounce' : ''
      } ${title === 'Emissions' ? 'animate-pulse' : ''} ${
        title === 'Scrap Purity' ? 'animate-pulse' : ''
      } ${title === 'Battery Level' ? 'animate-pulse' : ''} ${
        title === 'Air Quality' ? 'animate-pulse' : ''}`}>
        {animatedValue.toFixed(title === 'Vibration' ? 2 : title === 'Emissions' ? 0 : 1)} {unit}
      </div>

      <div className={`relative ${title === 'Vibration' ? 'animate-pulse' : ''}`}>
        <svg
          width={size}
          height={size}
          className={`drop-shadow-sm relative z-10 ${title === 'Vibration' ? 'animate-pulse' : ''} ${
            title === 'Emissions' ? 'animate-pulse' : ''
          } ${title === 'Scrap Purity' ? 'animate-pulse' : ''} ${
            title === 'Battery Level' ? 'animate-pulse' : ''
          } ${title === 'Air Quality' ? 'animate-pulse' : ''}`}
          style={{
            filter: title === 'Temperature' ?
              `drop-shadow(0 0 ${glowIntensity * 15}px ${getStatusColor(status)}) brightness(${1 + glowIntensity * 0.5})` :
              title === 'Vibration' ?
              `drop-shadow(0 0 8px #3b82f6) hue-rotate(${Date.now() % 360}deg)` :
              title === 'Emissions' ?
              `drop-shadow(0 0 6px #6b7280) contrast(1.2)` :
              title === 'Scrap Purity' ?
              `drop-shadow(0 0 8px #f59e0b) saturate(1.5)` :
              title === 'Battery Level' ?
              `drop-shadow(0 0 8px #10b981) brightness(1.1)` :
              title === 'Air Quality' ?
              `drop-shadow(0 0 6px #3b82f6) opacity(0.9)` :
              `drop-shadow(0 0 ${glowIntensity * 8}px ${getStatusColor(status)})`
          }}
        >
          {/* Outer ring with dynamic glow */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="6"
          />

          {/* Colored segments with enhanced gradients */}
          <defs>
            <radialGradient id={`glow-${title}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={getStatusColor(status)} stopOpacity={glowIntensity} />
              <stop offset="100%" stopColor={getStatusColor(status)} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`vibration-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={`emissions-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
            <linearGradient id={`purity-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id={`battery-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id={`air-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Background glow circle for temperature */}
          {title === 'Temperature' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill={`url(#glow-${title})`}
              opacity={glowIntensity * 0.5}
            />
          )}

          {/* Special background effects for other sensors */}
          {title === 'Vibration' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="none"
              stroke="url(#vibration-${title})"
              strokeWidth="2"
              opacity="0.3"
              className="animate-pulse"
            />
          )}

          {title === 'Emissions' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="none"
              stroke="url(#emissions-${title})"
              strokeWidth="2"
              opacity="0.4"
              className="animate-pulse"
            />
          )}

          {title === 'Scrap Purity' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="none"
              stroke="url(#purity-${title})"
              strokeWidth="2"
              opacity="0.3"
              className="animate-pulse"
            />
          )}

          {title === 'Battery Level' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="none"
              stroke="url(#battery-${title})"
              strokeWidth="2"
              opacity="0.3"
              className="animate-pulse"
            />
          )}

          {title === 'Air Quality' && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="none"
              stroke="url(#air-${title})"
              strokeWidth="2"
              opacity="0.3"
              className="animate-pulse"
            />
          )}

          <path
            d={`M ${centerX + Math.cos((-30 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((-30 * Math.PI) / 180) * (radius - 3)}
                 A ${radius - 3} ${radius - 3} 0 0 1 ${centerX + Math.cos((45 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((45 * Math.PI) / 180) * (radius - 3)}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
          />
          <path
            d={`M ${centerX + Math.cos((45 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((45 * Math.PI) / 180) * (radius - 3)}
                 A ${radius - 3} ${radius - 3} 0 0 1 ${centerX + Math.cos((135 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((135 * Math.PI) / 180) * (radius - 3)}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
          />
          <path
            d={`M ${centerX + Math.cos((135 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((135 * Math.PI) / 180) * (radius - 3)}
                 A ${radius - 3} ${radius - 3} 0 0 1 ${centerX + Math.cos((210 * Math.PI) / 180) * (radius - 3)} ${centerY + Math.sin((210 * Math.PI) / 180) * (radius - 3)}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="4"
          />

          {/* Tick marks */}
          {ticks}

          {/* Center hub with enhanced effects */}
          <circle
            cx={centerX}
            cy={centerY}
            r="8"
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="3"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="5"
            fill="#374151"
          />

          {/* Enhanced needle with special effects */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke={getStatusColor(status)}
            strokeWidth={title === 'Temperature' ? "4" : "3"}
            strokeLinecap="round"
            className={title === 'Vibration' ? 'animate-pulse' : ''}
            style={{
              filter: title === 'Temperature' ?
                `drop-shadow(0 0 8px ${getStatusColor(status)}) drop-shadow(0 0 16px ${getStatusColor(status)}40)` :
                title === 'Vibration' ?
                `drop-shadow(0 0 6px #3b82f6) drop-shadow(0 0 12px #8b5cf640)` :
                title === 'Emissions' ?
                `drop-shadow(0 0 4px #6b7280)` :
                title === 'Scrap Purity' ?
                `drop-shadow(0 0 6px #f59e0b)` :
                title === 'Battery Level' ?
                `drop-shadow(0 0 6px #10b981)` :
                title === 'Air Quality' ?
                `drop-shadow(0 0 4px #3b82f6)` :
                `drop-shadow(0 0 4px ${getStatusColor(status)})`,
              transformOrigin: `${centerX}px ${centerY}px`,
            }}
          />

          {/* Needle tip with special effects */}
          <circle
            cx={needleX}
            cy={needleY}
            r={title === 'Temperature' ? "3" : "2"}
            fill={getStatusColor(status)}
            className={title === 'Vibration' ? 'animate-ping' : ''}
            style={{
              filter: title === 'Temperature' ?
                `drop-shadow(0 0 6px ${getStatusColor(status)})` :
                title === 'Vibration' ?
                `drop-shadow(0 0 8px #3b82f6)` :
                title === 'Emissions' ?
                `drop-shadow(0 0 4px #6b7280)` :
                title === 'Scrap Purity' ?
                `drop-shadow(0 0 6px #f59e0b)` :
                title === 'Battery Level' ?
                `drop-shadow(0 0 6px #10b981)` :
                title === 'Air Quality' ?
                `drop-shadow(0 0 4px #3b82f6)` :
                `drop-shadow(0 0 3px ${getStatusColor(status)})`,
            }}
          />

          {/* Enhanced hub with special effects */}
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill={getStatusColor(status)}
            className={title === 'Vibration' ? 'animate-spin' : ''}
            style={{
              filter: title === 'Temperature' ?
                `drop-shadow(0 0 6px ${getStatusColor(status)})` :
                title === 'Vibration' ?
                `drop-shadow(0 0 8px #3b82f6)` :
                title === 'Emissions' ?
                `drop-shadow(0 0 4px #6b7280)` :
                title === 'Scrap Purity' ?
                `drop-shadow(0 0 6px #f59e0b)` :
                title === 'Battery Level' ?
                `drop-shadow(0 0 6px #10b981)` :
                title === 'Air Quality' ?
                `drop-shadow(0 0 4px #3b82f6)` :
                `drop-shadow(0 0 3px ${getStatusColor(status)})`,
            }}
          />

          {/* Burn particles for temperature */}
          {title === 'Temperature' && particles.map(particle => (
            <circle
              key={particle.id}
              cx={particle.x}
              cy={particle.y}
              r={particle.life * 4}
              fill={getStatusColor(status)}
              opacity={particle.life * 0.8}
              style={{
                filter: `blur(1px)`,
              }}
            />
          ))}

          {/* Vibration wave effects */}
          {title === 'Vibration' && (
            <>
              <circle
                cx={centerX + Math.cos(needleAngleRad) * (needleLength * 0.3)}
                cy={centerY + Math.sin(needleAngleRad) * (needleLength * 0.3)}
                r="3"
                fill="#3b82f6"
                opacity="0.6"
                className="animate-ping"
              />
              <circle
                cx={centerX + Math.cos(needleAngleRad) * (needleLength * 0.6)}
                cy={centerY + Math.sin(needleAngleRad) * (needleLength * 0.6)}
                r="2"
                fill="#8b5cf6"
                opacity="0.4"
                className="animate-ping"
                style={{ animationDelay: '200ms' }}
              />
            </>
          )}

          {/* Emissions smoke effects */}
          {title === 'Emissions' && (
            <>
              <circle
                cx={centerX + 10}
                cy={centerY - 15}
                r="2"
                fill="#6b7280"
                opacity="0.5"
                className="animate-bounce"
              />
              <circle
                cx={centerX - 8}
                cy={centerY - 12}
                r="1.5"
                fill="#9ca3af"
                opacity="0.4"
                className="animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
              <circle
                cx={centerX + 5}
                cy={centerY - 8}
                r="1"
                fill="#d1d5db"
                opacity="0.3"
                className="animate-bounce"
                style={{ animationDelay: '600ms' }}
              />
            </>
          )}

          {/* Scrap purity melting effects */}
          {title === 'Scrap Purity' && (
            <>
              <path
                d={`M ${centerX - 5} ${centerY + radius - 10} Q ${centerX} ${centerY + radius - 5} ${centerX + 5} ${centerY + radius - 10}`}
                fill="#f59e0b"
                opacity="0.4"
                className="animate-pulse"
              />
              <circle
                cx={centerX}
                cy={centerY + radius - 8}
                r="3"
                fill="#fbbf24"
                opacity="0.6"
                className="animate-pulse"
              />
            </>
          )}

          {/* Battery charging effects */}
          {title === 'Battery Level' && (
            <>
              <rect
                x={centerX - 2}
                y={centerY - radius + 5}
                width="4"
                height="8"
                fill="#10b981"
                opacity="0.5"
                className="animate-pulse"
              />
              <rect
                x={centerX - 1}
                y={centerY - radius + 6}
                width="2"
                height="6"
                fill="#34d399"
                opacity="0.7"
                className="animate-pulse"
              />
            </>
          )}

          {/* Air quality floating particles */}
          {title === 'Air Quality' && (
            <>
              <circle
                cx={centerX + 12}
                cy={centerY - 10}
                r="1.5"
                fill="#3b82f6"
                opacity="0.6"
                className="animate-bounce"
              />
              <circle
                cx={centerX - 10}
                cy={centerY + 8}
                r="1"
                fill="#60a5fa"
                opacity="0.5"
                className="animate-bounce"
                style={{ animationDelay: '400ms' }}
              />
              <circle
                cx={centerX + 8}
                cy={centerY + 12}
                r="0.8"
                fill="#93c5fd"
                opacity="0.4"
                className="animate-bounce"
                style={{ animationDelay: '800ms' }}
              />
            </>
          )}
        </svg>

        {/* Enhanced status indicator */}
        <div className="absolute top-1 right-1">
          <div className={`w-3 h-3 rounded-full border-2 border-white/20 ${
            status === 'critical' ? 'bg-red-500 animate-pulse shadow-red-500/80 shadow-lg' :
            status === 'warning' ? 'bg-yellow-500 animate-bounce shadow-yellow-500/80 shadow-lg' :
            'bg-green-500 shadow-green-500/80 shadow-lg'
          }`} style={{
            boxShadow: status === 'critical' ?
              `0 0 ${glowIntensity * 25}px #ef4444, 0 0 ${glowIntensity * 50}px #ef444440` :
              status === 'warning' ?
              `0 0 ${glowIntensity * 20}px #f59e0b, 0 0 ${glowIntensity * 40}px #f59e0b40` :
              `0 0 ${glowIntensity * 15}px #10b981, 0 0 ${glowIntensity * 30}px #10b98140`
          }} />
        </div>

        {/* Special effect indicators */}
        {title === 'Temperature' && status === 'critical' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
              <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {title === 'Vibration' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {title === 'Emissions' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {title === 'Scrap Purity' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {title === 'Battery Level' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-1 h-1 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {title === 'Air Quality' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-300 rounded-full animate-ping" style={{ animationDelay: '300ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '600ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function IndustrialGauge({
  title,
  value,
  min = 0,
  max,
  unit,
  status = 'normal',
  type = 'speedometer',
  size = 200
}: GaugeProps) {
  return (
    <AnimatedGauge
      title={title}
      value={value}
      min={min}
      max={max}
      unit={unit}
      status={status}
      type={type}
      size={size}
    />
  );
}

export function TemperatureGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Temperature"
      value={value}
      max={2000}
      unit="°C"
      status={status}
      type="speedometer"
    />
  );
}

export function VibrationGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Vibration"
      value={value}
      max={10}
      unit="Hz"
      status={status}
      type="radial"
    />
  );
}

export function EmissionGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Emissions"
      value={value}
      max={150}
      unit="ppm"
      status={status}
      type="speedometer"
    />
  );
}

export function ScrapPurityGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Scrap Purity"
      value={value}
      max={100}
      unit="%"
      status={status}
      type="radial"
    />
  );
}

export function BatteryGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Battery Level"
      value={value}
      max={100}
      unit="%"
      status={status}
      type="speedometer"
    />
  );
}

export function AirQualityGauge({ value, status }: { value: number; status?: 'normal' | 'warning' | 'critical' }) {
  return (
    <IndustrialGauge
      title="Air Quality"
      value={value}
      max={500}
      unit="AQI"
      status={status}
      type="radial"
    />
  );
}