'use client';

import { useState } from 'react';

export default function TeamMembersPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground">Manage your team members and their roles.</p>
        </div>
        <button 
          onClick={() => setIsInviteOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Invite Member
        </button>
      </div>

      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Dummy row */}
            <tr className="border-b border-gray-200 dark:border-zinc-800 last:border-0">
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">JD</div>
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-xs text-gray-500">john@example.com</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">Admin</td>
              <td className="px-6 py-4">Engineering</td>
              <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span></td>
              <td className="px-6 py-4 text-right">
                <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input type="email" className="w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" placeholder="colleague@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
