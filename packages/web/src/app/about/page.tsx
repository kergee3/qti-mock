'use client';

import { Box, Typography, Card, CardContent, Link } from '@mui/material';

export default function AboutPage() {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        About
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            QTI Demo
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            NexCBT は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            技術スタック
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2 }}>
            <li>Next.js 15 (App Router)</li>
            <li>Vue 3 + Vite (QTI Player)</li>
            <li>Material-UI v7</li>
            <li>TypeScript</li>
            <li>Turborepo (Monorepo)</li>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            QTI 3.0 について
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            QTI (Question and Test Interoperability) は、IMS Global Learning Consortium が策定した
            アセスメントコンテンツの相互運用性を実現するための国際標準規格です。
          </Typography>
          <Link
            href="https://www.imsglobal.org/question/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            IMS Global - QTI Specification
          </Link>
        </CardContent>
      </Card>
    </Box>
  );
}
