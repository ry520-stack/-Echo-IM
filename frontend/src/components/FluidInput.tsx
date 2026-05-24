import { useState, forwardRef } from 'react';

interface FluidInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: any) => void;
  isRecording?: boolean;
  onMicClick?: () => void;
}

const FluidInput = forwardRef<HTMLTextAreaElement, FluidInputProps>(
  ({ value, onChange, onFocus, onBlur, className, style, isRecording, onMicClick, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div
        className={`flex items-end w-full min-h-[52px] rounded-3xl border transition-all duration-300 ${
          isFocused
            ? 'border-primary-400 bg-white/80 dark:bg-zinc-800/80 shadow-sm'
            : 'border-gray-200 bg-gray-50/80 dark:border-zinc-700 dark:bg-zinc-800/50'
        } ${isRecording ? 'border-primary-400 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/20 ring-2 ring-primary-500/20' : ''} ${className || ''}`}
        style={style}
      >
        {/* 麦克风按钮 */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onMicClick?.(); }}
          className={`flex-shrink-0 w-10 h-10 ml-1.5 mb-1.5 rounded-full flex items-center justify-center transition-all duration-200 ${
            isRecording
              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30 animate-pulse'
              : 'bg-gray-200/80 text-gray-500 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </button>

        {/* 输入框 */}
        <textarea
          {...rest}
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder="输入消息..."
          onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 px-2 py-3.5 leading-relaxed"
        />
      </div>
    );
  }
);

export default FluidInput;
