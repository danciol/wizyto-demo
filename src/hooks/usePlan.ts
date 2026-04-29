import { useSubscription } from './useSubscription';
import { hasFeature, type FeatureKey } from '@/config/plans';

export function usePlan() {
  const { planId } = useSubscription();
  return {
    planId,
    can: (feature: FeatureKey) => hasFeature(planId, feature),
  };
}
