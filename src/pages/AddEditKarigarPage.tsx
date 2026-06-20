import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Save } from 'lucide-react';
import { useKarigarStore } from '../store/karigarStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

const karigarSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  skill: z.string().min(1, 'Skill is required'),
  contact: z.string().length(10, 'Contact must be exactly 10 digits').regex(/^\d+$/, 'Contact must be numeric'),
  aadhaarLast4: z.string().length(4, 'Aadhaar must be last 4 digits').regex(/^\d+$/, 'Aadhaar must be numeric'),
  wageType: z.enum(['perPiece', 'perGram', 'daily']),
  wageRate: z.coerce.number().gt(0, 'Wage rate must be greater than 0'),
  isActive: z.boolean(),
  address: z.string().min(1, 'Address is required'),
  specialization: z.string().optional(),
  advanceBalance: z.coerce.number().min(0, 'Advance balance must be >= 0').optional()
});

type KarigarFormValues = z.infer<typeof karigarSchema>;

export const AddEditKarigarPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { karigars, addKarigar, updateKarigar } = useKarigarStore();
  const isEdit = !!id;

  const currentKarigar = isEdit ? karigars.find(k => k.id === id) : null;

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<KarigarFormValues>({
    resolver: zodResolver(karigarSchema),
    defaultValues: {
      name: '',
      skill: 'Chainsmith',
      contact: '',
      aadhaarLast4: '',
      wageType: 'perPiece',
      wageRate: 0,
      isActive: true,
      address: '',
      specialization: '',
      advanceBalance: 0
    }
  });

  useEffect(() => {
    if (isEdit && currentKarigar) {
      setValue('name', currentKarigar.name);
      setValue('skill', currentKarigar.skill || currentKarigar.specialization || 'Chainsmith');
      setValue('contact', currentKarigar.contact || currentKarigar.phone || '');
      setValue('aadhaarLast4', currentKarigar.aadhaarLast4 || '');
      setValue('wageType', currentKarigar.wageType || 'perPiece');
      setValue('wageRate', currentKarigar.wageRate || 0);
      setValue('isActive', currentKarigar.isActive !== undefined ? currentKarigar.isActive : true);
      setValue('address', currentKarigar.address || '');
      setValue('specialization', currentKarigar.specialization || '');
      setValue('advanceBalance', currentKarigar.advanceBalance || 0);
    }
  }, [isEdit, currentKarigar, setValue]);

  const onSubmit = async (data: KarigarFormValues) => {
    try {
      if (isEdit && id) {
        await updateKarigar(id, {
          name: data.name,
          phone: data.contact,
          contact: data.contact,
          address: data.address,
          specialization: data.specialization || data.skill,
          skill: data.skill,
          aadhaarLast4: data.aadhaarLast4,
          wageType: data.wageType,
          wageRate: data.wageRate,
          isActive: data.isActive,
          advanceBalance: data.advanceBalance
        });
        toast.success('Artisan updated successfully');
      } else {
        await addKarigar({
          name: data.name,
          phone: data.contact,
          contact: data.contact,
          address: data.address,
          specialization: data.specialization || data.skill,
          skill: data.skill,
          aadhaarLast4: data.aadhaarLast4,
          wageType: data.wageType,
          wageRate: data.wageRate,
          isActive: data.isActive,
          advanceBalance: data.advanceBalance || 0
        });
        toast.success('Artisan registered successfully');
      }
      navigate('/karigars');
    } catch (error) {
      toast.error('Failed to save artisan details');
      console.error(error);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-luxury-border-dim pb-6">
        <button
          onClick={() => navigate('/karigars')}
          className="flex items-center gap-2 text-luxury-text-muted hover:text-gold-400 transition-colors uppercase tracking-[0.2em] text-[10px] font-black"
        >
          <ArrowLeft size={16} /> Back to Artisans
        </button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-luxury-text tracking-tight uppercase">
            {isEdit ? 'Edit' : 'Register'}{' '}
            <span className="text-gold-400">Artisan</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-luxury-charcoal border border-luxury-border rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Karigar Name"
            placeholder="Enter full name"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Skill Type</label>
            <select
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
              {...register('skill')}
            >
              <option value="Chainsmith">Chainsmith</option>
              <option value="Stone Setter">Stone Setter</option>
              <option value="Casting Artisan">Casting Artisan</option>
              <option value="Polisher">Polisher</option>
              <option value="Engraver">Engraver</option>
              <option value="General Goldsmith">General Goldsmith</option>
              <option value="Silversmith">Silversmith</option>
            </select>
            {errors.skill && <p className="text-xs text-red-500">{errors.skill.message}</p>}
          </div>

          <Input
            label="Contact Number (10 Digits)"
            placeholder="e.g. 9876543210"
            error={errors.contact?.message}
            {...register('contact')}
          />

          <Input
            label="Aadhaar Last 4 Digits"
            placeholder="e.g. 1234"
            maxLength={4}
            error={errors.aadhaarLast4?.message}
            {...register('aadhaarLast4')}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-luxury-text-muted">Wage Type</label>
            <select
              className="w-full h-11 bg-luxury-input border border-luxury-border-dim rounded-lg px-4 text-sm text-luxury-text outline-none focus:border-gold-400"
              {...register('wageType')}
            >
              <option value="perPiece">Per Piece</option>
              <option value="perGram">Per Gram</option>
              <option value="daily">Daily Wage</option>
            </select>
            {errors.wageType && <p className="text-xs text-red-500">{errors.wageType.message}</p>}
          </div>

          <Input
            label="Wage Rate (INR)"
            type="number"
            step="0.01"
            placeholder="Enter rate"
            error={errors.wageRate?.message}
            {...register('wageRate')}
          />

          {!isEdit && (
            <Input
              label="Starting Advance Balance (INR)"
              type="number"
              placeholder="0"
              error={errors.advanceBalance?.message}
              {...register('advanceBalance')}
            />
          )}

          <div className="flex items-center gap-3 h-full pt-8">
            <input
              type="checkbox"
              id="isActive"
              className="w-5 h-5 accent-gold-400 rounded cursor-pointer bg-luxury-input border-luxury-border"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-sm font-bold text-luxury-text cursor-pointer">
              Active Artisan
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-luxury-text-muted">Workshop/Resident Address</label>
          <textarea
            rows={3}
            placeholder="Enter address..."
            className="w-full bg-luxury-input border border-luxury-border-dim rounded-lg p-4 text-sm text-luxury-text outline-none focus:border-gold-400"
            {...register('address')}
          />
          {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
        </div>

        <Input
          label="Specialization Notes (Optional)"
          placeholder="e.g. Handmade antique finish casting"
          error={errors.specialization?.message}
          {...register('specialization')}
        />

        <div className="pt-4 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/karigars')}
            className="w-1/2 h-12 border-luxury-border hover:bg-luxury-surface/50 text-[11px] font-black uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            disabled={isSubmitting}
            className="w-1/2 h-12 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2"
          >
            {isEdit ? <Save size={16} /> : <UserPlus size={16} />}
            {isEdit ? 'Save Changes' : 'Register Artisan'}
          </Button>
        </div>
      </form>
    </div>
  );
};
