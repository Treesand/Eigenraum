interface ErrorNoticeProps {
  message: string;
}

export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <p className="error-notice" role="status">
      {message}
    </p>
  );
}
