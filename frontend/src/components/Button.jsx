// components/Button.jsx
// ปุ่มมาตรฐานของระบบ รองรับ 3 สไตล์: primary, outline, ghost

export default function Button({
  children,
  variant = "primary",
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
