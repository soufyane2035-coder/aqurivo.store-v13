import { AdminEditorialAgentView } from '@/features/admin/AdminEditorialAgentView';

export const metadata = {
  title: 'Editorial Agent',
  robots: { index: false, follow: false },
};

export default function EditorialAgentPage() {
  return <AdminEditorialAgentView />;
}
