export const formatCurrency = (val: number | string): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export const formatDate = (dateStr: string): string => {
  try {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  } catch (_e) {
    return dateStr;
  }
};
