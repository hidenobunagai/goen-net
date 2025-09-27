import { Box, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
// NOTE: Details navigation removed per requirement; only names are shown.

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type UserRow = Partial<Record<'id' | 'firstName' | 'lastName' | 'email', unknown>>;

const Members: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let abort = false;
    const load = async () => {
      try {
        const res = await fetch('/api/users');
        const rows = await res.json();
        if (abort) return;
        const list: User[] = (rows as UserRow[] | undefined || []).map((r) => ({
          id: String(r.id),
          firstName: String(r.firstName || ''),
          lastName: String(r.lastName || ''),
          email: String(r.email || ''),
        }));
        setUsers(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => { abort = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  }, [users, query]);

  if (loading) {
    return <Typography>Loading members...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Members
        </Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search (Name)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={1} align="center">
                  <Typography variant="body2">No matching members found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Members;
