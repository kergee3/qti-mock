'use client';

import { Box, IconButton, Tooltip, Button, Divider } from '@mui/material';

export type QuestionStatus = 'not-started' | 'in-progress' | 'answered-correct' | 'answered-incorrect' | 'answered-external';

interface QuestionSidebarProps {
  itemCount: number;
  statuses: QuestionStatus[];
  currentIndex: number;
  onQuestionClick: (index: number) => void;
  onFinishTest: () => void;
}

const getBackgroundColor = (status: QuestionStatus, isCurrent: boolean): string => {
  if (isCurrent) {
    return '#1976d2'; // 青（現在回答中）
  }
  switch (status) {
    case 'answered-correct':
      return '#4caf50'; // 緑（正解）
    case 'answered-incorrect':
      return '#f44336'; // 赤（不正解）
    case 'answered-external':
      return '#ff9800'; // オレンジ（外部採点・未採点）
    default:
      return '#e0e0e0'; // グレー（未回答）
  }
};

const getTextColor = (status: QuestionStatus, isCurrent: boolean): string => {
  if (isCurrent) {
    return '#fff';
  }
  switch (status) {
    case 'answered-correct':
    case 'answered-incorrect':
    case 'answered-external':
      return '#fff';
    default:
      return '#666';
  }
};

const getStatusLabel = (status: QuestionStatus, isCurrent: boolean): string => {
  if (isCurrent) {
    return '回答中';
  }
  switch (status) {
    case 'answered-correct':
      return '正解';
    case 'answered-incorrect':
      return '不正解';
    case 'answered-external':
      return '未採点';
    default:
      return '未回答';
  }
};

export function QuestionSidebar({
  itemCount,
  statuses,
  currentIndex,
  onQuestionClick,
  onFinishTest,
}: QuestionSidebarProps) {
  return (
    <Box
      sx={{
        width: 64,
        minWidth: 64,
        borderRight: '1px solid #ddd',
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        overflowY: 'auto',
        backgroundColor: '#fafafa',
      }}
    >
      {/* 問題番号ボタン */}
      {Array.from({ length: itemCount }, (_, index) => {
        const status = statuses[index] || 'not-started';
        const isCurrent = currentIndex === index;

        return (
          <Tooltip
            key={index}
            title={`問${index + 1}: ${getStatusLabel(status, isCurrent)}`}
            placement="right"
          >
            <IconButton
              onClick={() => onQuestionClick(index)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                fontSize: '16px',
                fontWeight: isCurrent ? 'bold' : 'normal',
                bgcolor: getBackgroundColor(status, isCurrent),
                color: getTextColor(status, isCurrent),
                border: isCurrent ? '2px solid #0d47a1' : 'none',
                '&:hover': {
                  bgcolor: getBackgroundColor(status, isCurrent),
                  opacity: 0.85,
                },
              }}
            >
              {index + 1}
            </IconButton>
          </Tooltip>
        );
      })}

      {/* 終了ボタン - 問題番号のすぐ下 */}
      <Divider sx={{ width: '100%', my: 1 }} />
      <Tooltip title="テストを終了して結果を表示" placement="right">
        <Button
          variant="contained"
          color="error"
          size="small"
          onClick={onFinishTest}
          sx={{
            minWidth: 'auto',
            fontSize: '14px',
            px: 1.5,
            py: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          終了
        </Button>
      </Tooltip>
    </Box>
  );
}
