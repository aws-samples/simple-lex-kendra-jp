import {
  DocumentAttributeValueType,
  FacetResult,
} from '@aws-sdk/client-kendra';
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback } from 'react';

export type FilterType = {
  attributeKey: string;
  attributeType: DocumentAttributeValueType;
  value: (string | number | Date)[];
};

type Props = {
  facetResults: FacetResult[];
  filters: FilterType[];
  onChange: (fileters: FilterType[]) => void;
};

const FilterResult: React.FC<Props> = ({ facetResults, filters, onChange }) => {
  // チェックされているかどうか
  const isChecked = useCallback(
    (attributeKey: string, value: FilterType['value'][number]) => {
      // 同じ属性の value に含まれていれば、チェックとみなす
      const sameKeyFilter = filters.filter(
        (v) => v.attributeKey === attributeKey
      );
      if (sameKeyFilter.length === 0) {
        return false;
      }

      return sameKeyFilter[0].value?.includes(value) ?? false;
    },
    [filters]
  );

  const onChangeFilter = useCallback(
    (
      attributeKey: string,
      attributeType: FilterType['attributeType'],
      value: FilterType['value'][number],
      checked: boolean
    ) => {
      const index = filters.findIndex((v) => v.attributeKey === attributeKey);

      // 新規にチェックした場合
      if (index < 0) {
        if (checked) {
          const tmp = filters.concat([]);
          tmp.push({
            attributeKey,
            attributeType,
            value: [value],
          });
          onChange(tmp);
        }

        // 既にチェックされているものを更新した場合
      } else {
        const tmp = filters.concat([]);
        // チェックした場合は新たに追加する
        if (checked) {
          tmp[index].value.push(value);
          onChange(tmp);

          // チェック解除した場合は削除する
        } else {
          const valueIndex = tmp[index].value.findIndex((v) => v === value);
          if (valueIndex >= 0) {
            // value が 1 つしかない（全てチェックを外す）場合は filter ごと削除
            if (tmp[index].value.length === 1) {
              tmp.splice(index, 1);

              // value が複数ある場合は、チェック解除した value だけを削除
            } else {
              tmp[index].value.splice(valueIndex, 1);
            }
            onChange(tmp);
          }
        }
      }
    },
    [filters, onChange]
  );

  // フィルタのクリア
  const onClear = useCallback(
    (attributeKey: string) => {
      const index = filters.findIndex((v) => v.attributeKey === attributeKey);
      const tmp = filters.concat([]);
      tmp.splice(index, 1);
      onChange(tmp);
    },
    [filters, onChange]
  );

  return (
    <div className="text-gray-600">
      <div className="flex justify-center items-center font-bold mb-2">
        <FontAwesomeIcon className="mr-2" icon={faListCheck} />
        絞り込み
      </div>
      {facetResults.map((result, idx) => (
        <div key={idx} className="mb-2">
          <div>
            <span className="font-semibold mb-2">
              {result.DocumentAttributeKey}
            </span>

            <button
              className="ml-2 text-blue-600 font-thin text-sm hover:underline"
              onClick={() => {
                onClear(result.DocumentAttributeKey ?? '');
              }}
            >
              Clear
            </button>
          </div>
          <div>
            {result.DocumentAttributeValueCountPairs?.map((val, valIdx) => (
              <div key={valIdx} className="ml-2 text-sm mb-1">
                <input
                  type="checkbox"
                  id={`${idx}-${valIdx}`}
                  checked={isChecked(
                    result.DocumentAttributeKey ?? '',
                    val.DocumentAttributeValue?.StringValue ?? ''
                  )}
                  onChange={(e) => {
                    onChangeFilter(
                      result.DocumentAttributeKey ?? '',
                      result.DocumentAttributeValueType as DocumentAttributeValueType,
                      val.DocumentAttributeValue?.StringValue ?? '',
                      e.target.checked
                    );
                  }}
                />
                <label htmlFor={`${idx}-${valIdx}`} className="ml-2">
                  {val.DocumentAttributeValue?.StringValue}({val.Count})
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FilterResult;
