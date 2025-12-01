import { useCallback } from 'react';
import { useFEC } from '../context/FECContext';
import { FECParser } from '../core/FECParser';
import { FECCycleAnalyzer } from '../core/FECCycleAnalyzer';

export const useFECParser = () => {
  const {
    setFile1, setFile2,
    setLoading1, setLoading2,
    setParseResult1, setParseResult2,
    setCyclesResult1, setCyclesResult2,
    setError
  } = useFEC();

  const analyzer = new FECCycleAnalyzer();

  const parseFile1 = useCallback((file) => {
    setFile1(file);
    setError(null);
    setLoading1(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = FECParser.parse(e.target.result);
        setParseResult1(result);
        if (result.data?.length > 0) {
          setCyclesResult1(analyzer.analyzeFec(result.data));
        }
        setLoading1(false);
      } catch (err) {
        setError(`Erreur N: ${err.message}`);
        setLoading1(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const parseFile2 = useCallback((file) => {
    setFile2(file);
    setError(null);
    setLoading2(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = FECParser.parse(e.target.result);
        setParseResult2(result);
        if (result.data?.length > 0) {
          setCyclesResult2(analyzer.analyzeFec(result.data));
        }
        setLoading2(false);
      } catch (err) {
        setError(`Erreur N-1: ${err.message}`);
        setLoading2(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  return { parseFile1, parseFile2 };
};
