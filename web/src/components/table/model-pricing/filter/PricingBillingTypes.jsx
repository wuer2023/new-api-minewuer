/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import SelectableButtonGroup from '../../../common/ui/SelectableButtonGroup';

const PricingBillingTypes = ({
  filterBillingType,
  setFilterBillingType,
  models = [],
  loading = false,
  t,
}) => {
  const qtyCount = (type) =>
    models.filter((m) => (type === 'all' ? true : (m.billing_type ?? 0) === type))
      .length;

  const items = [
    { value: 'all', label: t('全部类型'), tagCount: qtyCount('all') },
    { value: 1, label: t('付费'), tagCount: qtyCount(1) },
    { value: 0, label: t('免费'), tagCount: qtyCount(0) },
  ];

  return (
    <SelectableButtonGroup
      title={t('收费分组')}
      items={items}
      activeValue={filterBillingType}
      onChange={setFilterBillingType}
      loading={loading}
      t={t}
    />
  );
};

export default PricingBillingTypes;
