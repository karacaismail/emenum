/**
 * Input Component
 *
 * Yeniden kullanilabilir form input componenti.
 * Label, helper text, error durumu ve farkli tipler destekler.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <Input label="E-posta" type="email" placeholder="ornek@email.com" />
 *
 * // Hata durumu
 * <Input label="Parola" type="password" error="Parola en az 8 karakter olmali" />
 *
 * // Helper text ile
 * <Input label="Kullanici Adi" helperText="Sadece harf ve rakam" />
 *
 * // Prefix/Suffix ile
 * <Input label="Fiyat" type="number" endAdornment="TL" startAdornment="₺" />
 *
 * // Textarea olarak
 * <Input label="Aciklama" as="textarea" rows={4} />
 * ```
 */

'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input sizes
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Base input props shared between input and textarea
 */
interface BaseInputProps {
  /** Label text */
  label?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Error message (displays instead of helper text when present) */
  error?: string;
  /** Input size */
  inputSize?: InputSize;
  /** Full width */
  fullWidth?: boolean;
  /** Prefix element (e.g., icon or text) - renamed to avoid conflict with HTML prefix attr */
  startAdornment?: ReactNode;
  /** Suffix element (e.g., icon or text) */
  endAdornment?: ReactNode;
  /** Whether the label is required indicator shown */
  required?: boolean;
  /** Additional wrapper class */
  wrapperClassName?: string;
  /** Additional label class */
  labelClassName?: string;
  /** Hide the label visually (still accessible) */
  hideLabel?: boolean;
}

/**
 * Props for input element
 */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseInputProps {
  /** Render as textarea instead */
  as?: 'input';
}

/**
 * Props for textarea element
 */
export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    BaseInputProps {
  /** Render as textarea */
  as: 'textarea';
}

/**
 * Combined props type
 */
export type InputComponentProps = InputProps | TextareaProps;

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base input styles
 */
const baseInputStyles = `
  block w-full rounded-lg border shadow-sm
  transition-colors duration-200
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-offset-0
  disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
`;

/**
 * Size styles for input
 */
const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

/**
 * State styles
 */
const stateStyles = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
  error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Error icon SVG
 */
function ErrorIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Eye icon for password toggle
 */
function EyeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

/**
 * Eye off icon for password toggle
 */
function EyeOffIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Input Component
 *
 * Yeniden kullanilabilir form input componenti.
 * Label, helper text ve error durumu destekler.
 */
const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputComponentProps
>((props, ref) => {
  const {
    label,
    helperText,
    error,
    inputSize = 'md',
    fullWidth = true,
    startAdornment,
    endAdornment,
    required,
    wrapperClassName = '',
    labelClassName = '',
    hideLabel = false,
    className = '',
    id,
    disabled,
    ...restProps
  } = props;

  // Generate unique ID if not provided
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordInput = 'type' in restProps && restProps.type === 'password';

  // Determine if textarea
  const isTextarea = 'as' in props && props.as === 'textarea';

  // Build input classes
  const inputClasses = [
    baseInputStyles,
    sizeStyles[inputSize],
    error ? stateStyles.error : stateStyles.default,
    startAdornment ? 'pl-10' : '',
    endAdornment || isPasswordInput ? 'pr-10' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // ARIA attributes
  const ariaAttributes = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : helperText ? helperId : undefined,
  };

  // Render input element
  const renderInput = () => {
    if (isTextarea) {
      const textareaProps = restProps as Omit<
        TextareaHTMLAttributes<HTMLTextAreaElement>,
        'size'
      >;
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={inputId}
          disabled={disabled}
          className={inputClasses}
          {...ariaAttributes}
          {...textareaProps}
        />
      );
    }

    const inputProps = restProps as Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'size'
    >;

    // Handle password type with visibility toggle
    const inputType = isPasswordInput && showPassword ? 'text' : inputProps.type;

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        id={inputId}
        disabled={disabled}
        className={inputClasses}
        {...ariaAttributes}
        {...inputProps}
        type={inputType}
      />
    );
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={`
            block text-sm font-medium text-gray-700 mb-1
            ${hideLabel ? 'sr-only' : ''}
            ${labelClassName}
          `}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Start Adornment (Prefix) */}
        {startAdornment && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {startAdornment}
          </div>
        )}

        {/* Input element */}
        {renderInput()}

        {/* End Adornment (Suffix) or Password toggle */}
        {(endAdornment || isPasswordInput) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isPasswordInput ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Parolayi gizle' : 'Parolayi goster'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            ) : (
              <span className="text-gray-400 pointer-events-none">{endAdornment}</span>
            )}
          </div>
        )}

        {/* Error icon */}
        {error && !endAdornment && !isPasswordInput && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-error-500">
            <ErrorIcon />
          </div>
        )}
      </div>

      {/* Helper text or Error message */}
      {(helperText || error) && (
        <p
          id={error ? errorId : helperId}
          className={`mt-1 text-sm ${
            error ? 'text-error-600' : 'text-gray-500'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Textarea component - alias for Input with as="textarea"
 *
 * @example
 * ```tsx
 * <Textarea label="Aciklama" rows={4} />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, Omit<TextareaProps, 'as'>>(
  (props, ref) => {
    return <Input ref={ref as React.Ref<HTMLInputElement | HTMLTextAreaElement>} as="textarea" {...props} />;
  }
);

Textarea.displayName = 'Textarea';

/**
 * Search Input - Input with search icon
 *
 * @example
 * ```tsx
 * <SearchInput placeholder="Ara..." onChange={handleSearch} />
 * ```
 */
export function SearchInput({
  className = '',
  ...props
}: Omit<InputProps, 'as' | 'startAdornment'>) {
  const searchIcon = (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  return <Input startAdornment={searchIcon} className={className} {...props} />;
}

/**
 * Form Field wrapper with consistent spacing
 *
 * @example
 * ```tsx
 * <FormField>
 *   <Input label="E-posta" type="email" />
 * </FormField>
 * ```
 */
export function FormField({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}
