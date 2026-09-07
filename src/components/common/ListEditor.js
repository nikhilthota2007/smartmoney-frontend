import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';

/**
 * Add/edit/remove rows of one repeating profile section.
 *
 * `fields` describes each column: { name, label, type, options, prefix, suffix }.
 * Every step of the wizard except goals is this component with a different
 * field list.
 */
const ListEditor = ({ section, fields, items, addLabel, emptyMessage }) => {
  const { addItem, updateItem, removeItem } = useProfile();

  return (
    <div className="list-editor">
      {items.length === 0 && <p className="list-editor-empty">{emptyMessage}</p>}

      {items.map((item, index) => (
        <div className="list-editor-row" key={item.id}>
          <div className="list-editor-number">{index + 1}</div>

          <div className="list-editor-fields">
            {fields.map((field) => {
              const id = `${section}-${item.id}-${field.name}`;
              const onChange = (e) => updateItem(section, item.id, field.name, e.target.value);

              return (
                <div className="list-editor-field" key={field.name}>
                  <label className="list-editor-label" htmlFor={id}>{field.label}</label>

                  {field.type === 'select' ? (
                    <select id={id} className="list-editor-input" value={item[field.name]} onChange={onChange}>
                      {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="list-editor-input-group">
                      {field.prefix && <span className="input-prefix">{field.prefix}</span>}
                      <input
                        id={id}
                        className="list-editor-input"
                        type={field.type || 'text'}
                        value={item[field.name]}
                        onChange={onChange}
                        placeholder={field.placeholder}
                      />
                      {field.suffix && <span className="input-suffix">{field.suffix}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            className="remove-debt-btn"
            onClick={() => removeItem(section, item.id)}
            aria-label={`Remove row ${index + 1}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}

      <button className="add-debt-btn" onClick={() => addItem(section)}>
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
};

export default ListEditor;
