interface StateNoticeProps {
  title: string;
  description: string;
}

export function StateNotice({ title, description }: StateNoticeProps) {
  return (
    <div className="state-notice">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
