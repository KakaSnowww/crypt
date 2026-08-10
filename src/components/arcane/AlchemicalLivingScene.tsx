import { BookOpen, FlaskConical, Sparkles } from 'lucide-react';

type AlchemicalLivingSceneProps = {
  compact?: boolean;
};

export function AlchemicalLivingScene({ compact = false }: AlchemicalLivingSceneProps) {
  return (
    <div
      aria-hidden="true"
      className={`living-alchemy${compact ? ' living-alchemy--compact' : ''}`}
    >
      <div className="living-alchemy__mist" />
      <div className="living-alchemy__orbit">
        <span />
        <span />
        <span />
      </div>
      <BookOpen className="living-alchemy__book living-alchemy__book--one" />
      <BookOpen className="living-alchemy__book living-alchemy__book--two" />
      <BookOpen className="living-alchemy__book living-alchemy__book--three" />
      <div className="living-alchemy__potion living-alchemy__potion--one">
        <FlaskConical />
        <span />
      </div>
      <div className="living-alchemy__potion living-alchemy__potion--two">
        <FlaskConical />
        <span />
      </div>
      <Sparkles className="living-alchemy__spark living-alchemy__spark--one" />
      <Sparkles className="living-alchemy__spark living-alchemy__spark--two" />
    </div>
  );
}
