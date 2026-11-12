import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';

/**
 * Add/edit/remove rows of one repeating profile section.
 *
 * `fields` describes each column: { name, label, type, options, prefix, suffix }.
 * Every step of the wizard is this component with a different field list.
 */
const ListEditor = ({ section, fields, items, addLabel, emptyMessage }) => {
  const { addItem, updateItem, removeItem } = useProfile();

  return (
    <div className="list-editor">
      {items.length === 0 && <p className="list-editor-empty">{emptyMessage}</p>}

      {items.map((item, index) => (
        <div className="list-row" key={item.id}>
          <div className={`list-row-fields list-row-fields-${fields.length}`}>
            {fields.map((field) => {
              const id = `${section}-${item.id}-${field.name}`;
              const onChange = (e) => updateItem(section, item.id, field.name, e.target.value);
              const isAmount = field.type === 'number';

              return (
                <div className={`field${isAmount ? ' field-amount' : ''}`} key={field.name}>
                  <label className="field-label" htmlFor={id}>
                    {field.label}
                  </label>
                  <div className="field-control">
                    {field.type === 'select' ? (
                      <select id={id} value={item[field.name]} onChange={onChange}>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        {field.prefix && <span className="field-affix">{field.prefix}</span>}
                        <input
                          id={id}
                          type={field.type || 'text'}
                          inputMode={isAmount ? 'decimal' : undefined}
                          value={item[field.name]}
                          onChange={onChange}
                          placeholder={field.placeholder}
                        />
                        {field.suffix && <span className="field-affix field-affix-end">{field.suffix}</span>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="icon-btn list-row-remove"
            onClick={() => removeItem(section, item.id)}
            aria-label={`Remove row ${index + 1}`}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button className="add-row" onClick={() => addItem(section)}>
        <Plus size={16} aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
};

export default ListEditor;
