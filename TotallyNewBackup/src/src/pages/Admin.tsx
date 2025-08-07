import { useEffect, useState } from "react";

function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">User Admin</h1>
      <table className="w-full border border-gray-600">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Tier</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2 text-left">Expires</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const expired =
              u.tier === "trial" && new Date(u.expires_at) < new Date();
            return (
              <tr key={i} className={expired ? "bg-red-700" : "bg-gray-900"}>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.tier}</td>
                <td className="p-2">
                  {new Date(u.created_at).toLocaleString()}
                </td>
                <td className="p-2">
                  {u.expires_at
                    ? new Date(u.expires_at).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;
