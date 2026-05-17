import '../styles/blackhole.css';

export default function BlackHoleBackground() {
  return (
    <div className="blackhole-container">
      <div className="blackhole">
        <div className="blackhole-circle" />
        <div className="blackhole-disc" />
      </div>
      <div className="absolute inset-0 bg-black/30 z-10" />
    </div>
  );
}
