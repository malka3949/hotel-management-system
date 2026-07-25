'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRooms, type Room, type RoomStatus, type CleaningStatus } from '@/lib/api/rooms';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoomStatusBadge } from '@/components/shared/RoomStatusBadge';
import { CleaningStatusBadge } from '@/components/shared/CleaningStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { getSocket, disconnectSocket } from '@/lib/socket';

export default function StatusBoardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    if (isAdmin && !selectedBranchId) {
      setLoading(false);
      setRooms([]);
      return;
    }
    const branchId = isAdmin ? selectedBranchId : (user.branchId ?? undefined);
    try {
      const data = await getRooms(branchId ? { branchId } : {});
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, selectedBranchId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!user) return;

    const token =
      typeof localStorage !== 'undefined' ? (localStorage.getItem('auth_token') ?? '') : '';
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(
      'room:status:updated',
      (payload: { roomId: string; status: RoomStatus; cleaningStatus: CleaningStatus }) => {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === payload.roomId
              ? { ...r, status: payload.status, cleaningStatus: payload.cleaningStatus }
              : r,
          ),
        );
      },
    );

    return () => {
      disconnectSocket();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        טוען...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          לוח סטטוס חדרים
        </h1>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: connected ? '#DCFCE7' : '#FEE2E2',
            color: connected ? '#15803D' : '#DC2626',
          }}
        >
          {connected ? '● חי' : '○ מנותק'}
        </span>
      </div>

      {isAdmin && (
        <div className="mb-5">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <option value="">בחר סניף</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {isAdmin && !selectedBranchId ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          בחר סניף כדי לצפות בלוח הסטטוס
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)' }}>
                <th
                  className="text-right px-4 py-2 font-medium border-b"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  חדר
                </th>
                <th
                  className="text-right px-4 py-2 font-medium border-b"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  קומה
                </th>
                <th
                  className="text-right px-4 py-2 font-medium border-b"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  סוג
                </th>
                <th
                  className="text-right px-4 py-2 font-medium border-b"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  סטטוס תפעולי
                </th>
                <th
                  className="text-right px-4 py-2 font-medium border-b"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  סטטוס ניקיון
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="border-b transition-colors"
                  style={{ borderColor: 'var(--color-border-default)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {room.number}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {room.floor ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {room.roomType.name}
                  </td>
                  <td className="px-4 py-3">
                    <RoomStatusBadge status={room.status} />
                  </td>
                  <td className="px-4 py-3">
                    <CleaningStatusBadge status={room.cleaningStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rooms.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              אין חדרים להצגה
            </div>
          )}
        </div>
      )}
    </div>
  );
}
