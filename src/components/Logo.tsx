export const Logo = ({
  className = 'w-auto h-5 text-chalkboard-120 dark:text-chalkboard-10',
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    className={className}
    viewBox="0 0 46.41 59"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M34.76 0C43.76 0 46.41 8.8 44.12 21.8C41.65 35.8 34.39 41.8 24.92 42.8L22.06 59L11.06 59L13.92 42.8C4.39 41.8 0 33.8 2.21 21.3C3.71 12.8 6.39 7.8 9.33 5.3C14.62 0.8 18.71 0.3 20.21 0.3L18.71 8.8C15.68 11.8 13.48 15.8 12.68 20.3C11.54 26.8 13.24 31.3 15.64 33L18.32 17.8C20.26 6.8 26.76 0 34.76 0ZM26.64 33L29.32 17.8C30.21 12.8 31.5 10 33 10C35 10 35.33 13.8 34.36 19.3C33.04 26.8 30.33 30.8 26.64 33Z"
      fill="currentColor"
    />
  </svg>
)
