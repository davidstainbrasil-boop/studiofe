import dynamic from 'next/dynamic';

const RealisticAvatarSystem = dynamic(
  () => import('@/components/avatars/realistic/RealisticAvatarSystem'),
  { ssr: false }
);

export default function RealisticAvatarProPage() {
  return (
    <div className="w-full h-screen">
      <RealisticAvatarSystem />
    </div>
  );
}
