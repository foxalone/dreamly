import type { Analysis } from './opportunities';

export function manualProgress(analysis: Analysis) {
  const items = [...analysis.content, ...analysis.links];
  return {
    pending: items.filter(i => i.state === 'pending').length,
    handedOff: items.filter(i => i.state === 'handed_off').length,
    done: items.filter(i => i.state === 'done').length,
    rejected: items.filter(i => i.state === 'rejected').length,
    applied: [analysis.title, analysis.description].filter(i => i.state === 'applied').length,
  };
}

export function updateManualTask(analysis: Analysis, group: 'content' | 'links', index: number, action: string, value?: unknown) {
  const items = [...analysis[group]];
  if (!Number.isInteger(index) || index < 0 || index >= items.length) throw new Error('Рекомендация не найдена.');
  const now = new Date().toISOString();
  if (action === 'complete') items[index] = { ...items[index], state: 'done', completedAt: now };
  else if (action === 'handoff') {
    if (items[index].state !== 'pending') throw new Error('Задача уже передана, выполнена или отклонена.');
    items[index] = { ...items[index], state: 'handed_off', handedOffAt: now };
  } else if (action === 'reopen') items[index] = { ...items[index], state: 'pending', completedAt: null, handedOffAt: null };
  else if (action === 'reject') items[index] = { ...items[index], state: 'rejected' };
  else if (action === 'edit') {
    if (items[index].state === 'done') throw new Error('Сначала верните выполненную задачу в работу.');
    const text = String(value || '').trim();
    if (!text || text.length > 2000 || /<[^>]*>/.test(text)) throw new Error('Введите текст длиной до 2000 символов без HTML.');
    if (group === 'links') throw new Error('Выберите ссылку из существующих страниц вручную.');
    items[index] = { ...items[index], text };
  } else throw new Error('Неизвестное действие.');
  return items;
}
