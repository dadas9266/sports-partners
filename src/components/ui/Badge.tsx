interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "orange" | "blue" | "yellow" | "red" | "green" | "gray";
  size?: "sm" | "md";
}

const variants: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const sizes: Record<string, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
};

export default function Badge({ children, variant = "gray", size = "sm" }: BadgeProps) {
  return (
    <span
      className={`inline-block font-medium rounded-full ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}
