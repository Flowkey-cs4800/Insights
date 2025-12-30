import { Paper, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, onClick }: StatCardProps) {
  return (
    <Paper 
      onClick={onClick}
      sx={{
        p: 2,
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default StatCard;