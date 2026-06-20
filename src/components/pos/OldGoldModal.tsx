import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useSettingsStore } from '../../store/settingsStore';
import { calculateOldGoldValue, formatCurrency } from '../../utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import type { OldGoldItem } from '../../types';

interface OldGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: OldGoldItem) => void;
}

export const OldGoldModal = ({ isOpen, onClose, onSave }: OldGoldModalProps) => {
  const { settings } = useSettingsStore();
  const [formData, setFormData] = useState({
    description: '',
    metalType: 'Gold',
    purity: '22K',
    grossWeight: '',
    melting: '92', // Default 92% touch
    rate: settings.goldRate?.toString() || '',
  });

  const [calculatedValue, setCalculatedValue] = useState(0);
  const [fineWeight, setFineWeight] = useState(0);

  useEffect(() => {
    const weight = parseFloat(formData.grossWeight) || 0;
    const melting = parseFloat(formData.melting) || 0;
    const rate = parseFloat(formData.rate) || 0;

    const fine = (weight * melting) / 100;
    const value = calculateOldGoldValue(weight, melting, rate);

    setFineWeight(fine);
    setCalculatedValue(value);
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.grossWeight || !formData.rate) return;

    const item: OldGoldItem = {
      id: uuidv4(),
      description: formData.description,
      metalType: formData.metalType,
      purity: formData.purity,
      grossWeight: parseFloat(formData.grossWeight),
      netWeight: parseFloat(formData.grossWeight), // Assuming net same as gross for now or could add field
      melting: parseFloat(formData.melting),
      fineWeight: fineWeight,
      rate: parseFloat(formData.rate),
      value: calculatedValue,
    };

    onSave(item);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      description: '',
      metalType: 'Gold',
      purity: '22K',
      grossWeight: '',
      melting: '92',
      rate: settings.goldRate?.toString() || '',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Evaluate Old Gold Asset" size="md">
      <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <Input
              label="Item Description"
              placeholder="e.g. Old Gold Chain, Broken Bangle"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-dim ml-1">Metal Type</label>
            <select
              value={formData.metalType}
              onChange={(e) => setFormData({ ...formData, metalType: e.target.value, rate: (e.target.value === 'Gold' ? settings.goldRate : settings.silverRate)?.toString() || '' })}
              className="w-full h-12 bg-luxury-input border border-luxury-border-dim rounded-2xl px-4 text-sm font-bold text-luxury-text focus:border-gold-400/40 outline-none transition-all"
            >
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          <Input
            label="Gross Weight (g)"
            type="number"
            step="0.001"
            placeholder="0.000"
            value={formData.grossWeight}
            onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
            required
          />

          <Input
            label="Melting / Touch (%)"
            type="number"
            step="0.1"
            placeholder="92.0"
            value={formData.melting}
            onChange={(e) => setFormData({ ...formData, melting: e.target.value })}
            required
          />

          <Input
            label="Current Rate (per g)"
            type="number"
            placeholder="0"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            required
          />
        </div>

        <div className="p-6 bg-luxury-surface border border-luxury-border-dim rounded-3xl space-y-4">
          <div className="flex justify-between items-center border-b border-luxury-border-dim pb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-muted">Fine Weight</span>
            <span className="text-xl font-serif font-bold text-luxury-text">{fineWeight.toFixed(3)} g</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wide text-gold-400/60">Estimated Buyback Value</p>
              <p className="text-3xl font-serif font-bold text-gold-400">{formatCurrency(calculatedValue)}</p>
            </div>
            <div className="p-3 bg-gold-400/5 border border-gold-400/10 rounded-2xl text-right">
              <p className="text-[8px] uppercase tracking-wide font-bold text-gold-400/60 leading-none">Credit</p>
              <p className="text-sm font-bold text-gold-400">Deduction</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" className="flex-1 py-4" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" className="flex-1 py-4 uppercase font-bold tracking-widest">
            Add to Bill
          </Button>
        </div>
      </form>
    </Modal>
  );
};
