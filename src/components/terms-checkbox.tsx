/**
 * Terms and Conditions Checkbox Component
 * Reusable checkbox for agreeing to terms and conditions
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TermsCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  required?: boolean
  termsType?: 'general' | 'ceo' | 'user'
}

export function TermsCheckbox({
  checked,
  onCheckedChange,
  required = false,
  termsType = 'general',
}: TermsCheckboxProps) {
  const getTermsText = () => {
    switch (termsType) {
      case 'ceo':
        return (
          <>
            I agree to the{' '}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
            , and I understand that as CEO, I have full administrative access to this platform.
          </>
        )
      case 'user':
        return (
          <>
            I agree to the{' '}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
          </>
        )
      default:
        return (
          <>
            I agree to the{' '}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
          </>
        )
    }
  }

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id="terms-checkbox"
        checked={checked}
        onCheckedChange={onCheckedChange}
        required={required}
        className="mt-0.5"
      />
      <Label
        htmlFor="terms-checkbox"
        className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
      >
        {getTermsText()}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
    </div>
  )
}
