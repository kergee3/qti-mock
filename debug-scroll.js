// Safari開発者ツールのコンソールで実行してください
// 問題1（短い問題）を表示した状態で実行

const container = document.querySelector('.main-content-vertical .player-container');
const qti3Container = document.querySelector('.vertical-layout .qti3-player-container');
const assessmentItem = document.querySelector('.vertical-layout .qti-assessment-item');
const itemBody = document.querySelector('.vertical-layout .qti-item-body');

console.log('=== player-container ===');
console.log('scrollWidth:', container?.scrollWidth);
console.log('clientWidth:', container?.clientWidth);
console.log('offsetWidth:', container?.offsetWidth);
console.log('scrollLeft:', container?.scrollLeft);

console.log('\n=== qti3-player-container ===');
console.log('offsetWidth:', qti3Container?.offsetWidth);
console.log('scrollWidth:', qti3Container?.scrollWidth);
console.log('computed width:', window.getComputedStyle(qti3Container).width);

console.log('\n=== qti-assessment-item ===');
console.log('offsetWidth:', assessmentItem?.offsetWidth);
console.log('scrollWidth:', assessmentItem?.scrollWidth);
console.log('computed width:', window.getComputedStyle(assessmentItem).width);

console.log('\n=== qti-item-body ===');
console.log('offsetWidth:', itemBody?.offsetWidth);
console.log('scrollWidth:', itemBody?.scrollWidth);
console.log('computed width:', window.getComputedStyle(itemBody).width);

// スクロール可能かチェック
const isScrollable = container?.scrollWidth > container?.clientWidth;
console.log('\n=== スクロール可能? ===');
console.log(isScrollable ? 'YES - scrollWidth > clientWidth' : 'NO - scrollWidth <= clientWidth');
