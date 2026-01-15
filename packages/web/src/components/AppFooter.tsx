import { Box, Typography } from '@mui/material';

export default function AppFooter() {
  return (
    <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
      <Typography variant="body2" color="text.secondary" align="center">
        Version {process.env.APP_VERSION} | {process.env.BUILD_YEAR}-{process.env.BUILD_MONTH}
      </Typography>
    </Box>
  );
}
