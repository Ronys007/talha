import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function Dashboard({ auth, admins }) {
    const [editingAdmin, setEditingAdmin] = useState(null);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    const toggleLock = (id) => {
        if (confirm('Are you sure you want to toggle the lock status for this admin?')) {
            router.post(route('superadmin.lock', id));
        }
    };

    const submitPasswordUpdate = (e) => {
        e.preventDefault();
        post(route('superadmin.password', editingAdmin), {
            onSuccess: () => {
                setEditingAdmin(null);
                reset();
                alert('Password updated successfully.');
            },
        });
    };

    return (
        <AppLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Super Admin Dashboard</h2>}
        >
            <Head title="Super Admin Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4">Manage Admins</h3>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {admins.map((admin) => (
                                        <tr key={admin.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{admin.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.is_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {admin.is_locked ? 'Locked' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button 
                                                    onClick={() => toggleLock(admin.id)}
                                                    className={`mr-4 ${admin.is_locked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}
                                                >
                                                    {admin.is_locked ? 'Unlock' : 'Lock'}
                                                </button>
                                                <button 
                                                    onClick={() => setEditingAdmin(admin.id)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Change Password
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {editingAdmin && (
                            <div className="mt-8 border-t pt-6">
                                <h4 className="text-md font-bold mb-4">Change Password</h4>
                                <form onSubmit={submitPasswordUpdate} className="space-y-4 max-w-xl">
                                    <div>
                                        <label htmlFor="password">New Password</label>
                                        <input
                                            id="password"
                                            type="password"
                                            className="form-control mt-1 block w-full"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            required
                                            style={{ border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }}
                                        />
                                        {errors.password && <span className="text-red-500 text-sm mt-2">{errors.password}</span>}
                                    </div>

                                    <div>
                                        <label htmlFor="password_confirmation">Confirm Password</label>
                                        <input
                                            id="password_confirmation"
                                            type="password"
                                            className="form-control mt-1 block w-full"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            required
                                            style={{ border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }}
                                        />
                                        {errors.password_confirmation && <span className="text-red-500 text-sm mt-2">{errors.password_confirmation}</span>}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button 
                                            type="submit" 
                                            disabled={processing}
                                            className="btn btn-primary"
                                            style={{ background: "#4f46e5", color: "white", padding: "8px 16px", borderRadius: "4px" }}
                                        >
                                            Save Password
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => { setEditingAdmin(null); reset(); }}
                                            className="text-gray-600 underline"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
