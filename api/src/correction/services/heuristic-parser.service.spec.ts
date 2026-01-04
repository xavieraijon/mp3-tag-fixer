import { Test, TestingModule } from '@nestjs/testing';
import { HeuristicParserService } from './heuristic-parser.service';

describe('HeuristicParserService (Regression)', () => {
  let service: HeuristicParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HeuristicParserService],
    }).compile();

    service = module.get<HeuristicParserService>(HeuristicParserService);
  });

  const testCases = [
    'Dj Pastis & Buenri - Pierenque (2000).mp3',
    'Makina - Xque Vol 5 - The Second Visit.mp3',
    'Chumi dj vs. dj ruboy-reagee.mp3',
    '01. Scott Brown - Elysium.wav',
    'garbage_filename_with_binary_garbage^°¨©.mp3',
    'Artist - Title (Remix) (Clean).mp3',
    'OnlyTitle.mp3',
  ];

  testCases.forEach((filename) => {
    it(`should match snapshot for: ${filename}`, () => {
      const result = service.parse(filename);
      // Remove strategies params to avoid redundant diffs if implementation detail changes,
      // but keep structure. Strategies are key to regression though.
      expect(result).toMatchSnapshot();
    });
  });

  // Test hints overriding
  it('should use hints if available and clean', () => {
    const result = service.parse(
      'bad_filename.mp3',
      'Good Artist',
      'Good Title',
    );
    expect(result.primaryCandidate).toEqual({
      artist: 'Good Artist',
      title: 'Good Title',
    });
    expect(result.hasGarbage).toBe(false);
  });

  // Test garbage hint rejection
  it('should ignore garbage hints', () => {
    const result = service.parse(
      'Clean Artist - Clean Title.mp3',
      'Garbage^°',
      'Good Title',
    );
    expect(result.primaryCandidate.artist).toBe('Clean Artist');
  });
});
