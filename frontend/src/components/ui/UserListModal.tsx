import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLikedBy, getRepostedBy } from '../../api/thoughts';

interface Props {
  title: string;
  thoughtId: number;
  type: 'liked-by' | 'reposted-by';
  onClose: () => void;
}

interface UserEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string;
}

export default function UserListModal({ title, thoughtId, type, onClose }: Props) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetcher = type === 'liked-by' ? getLikedBy : getRepostedBy;
    fetcher(thoughtId)
      .then(res => {
        setUsers(res.data.map((item: any) => item.user || item));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [thoughtId, type]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-2">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No one yet</p>
          ) : (
            users.map(u => (
              <Link key={u.id} to={`/profile/${u.username}`} onClick={onClose} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">
                    {u.display_name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{u.display_name}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
