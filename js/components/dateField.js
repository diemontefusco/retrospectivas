import { escapeHtml, todayLocalISO } from "../utils/formatters.js";

const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(value, placeholder) {
  const date = parseISO(value);
  if (!date) return { text: placeholder, placeholder: true };
  return {
    text: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    placeholder: false
  };
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
}

function calendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - offset, 12);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
}

function buttonClass(base, extra = "") {
  return `class="${base}${extra ? ` ${extra}` : ""}"`;
}

export function mountDateField(input, options = {}) {
  if (!input || input.dataset.dsDateMounted === "true") return input?.__dateField || null;

  const inputId = input.id || `date-${Math.random().toString(36).slice(2)}`;
  const initialValue = input.value || options.value || "";
  const placeholder = options.placeholder || "Seleccioná una fecha";
  const wrapper = document.createElement("div");
  wrapper.className = "ds-date-field";
  wrapper.dataset.dsDateField = inputId;

  input.dataset.dsDateMounted = "true";
  input.className = `${input.className || ""} ds-date-field__input`.trim();
  input.type = "hidden";
  input.id = inputId;
  wrapper.appendChild(input);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ds-date-field__trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${inputId}-calendar`);

  const value = document.createElement("span");
  value.className = "ds-date-field__value";
  const icon = document.createElement("span");
  icon.className = "ds-date-field__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "📅";
  trigger.append(value, icon);

  const backdrop = document.createElement("div");
  backdrop.className = "ds-date-field__backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");

  const popover = document.createElement("div");
  popover.className = "ds-date-field__popover";
  popover.id = `${inputId}-calendar`;
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", options.label || "Seleccionar fecha");

  wrapper.append(trigger, backdrop, popover);
  input.replaceWith(wrapper);

  let visibleMonth = parseISO(initialValue) || parseISO(todayLocalISO()) || new Date();
  let selectedValue = initialValue;
  let open = false;

  function updateValue() {
    const formatted = formatDisplay(selectedValue, placeholder);
    value.textContent = formatted.text;
    value.classList.toggle("is-placeholder", formatted.placeholder);
    input.value = selectedValue || "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderCalendar() {
    const selected = parseISO(selectedValue);
    const today = parseISO(todayLocalISO());
    const days = calendarDays(visibleMonth);

    popover.innerHTML = `
      <div class="ds-date-field__header">
        <button type="button" ${buttonClass("ds-date-field__nav")} data-date-prev aria-label="Mes anterior">‹</button>
        <div class="ds-date-field__month" aria-live="polite">${escapeHtml(monthLabel(visibleMonth))}</div>
        <button type="button" ${buttonClass("ds-date-field__nav")} data-date-next aria-label="Mes siguiente">›</button>
      </div>
      <div class="ds-date-field__weekdays" aria-hidden="true">
        ${WEEKDAYS.map(day => `<div class="ds-date-field__weekday">${day}</div>`).join("")}
      </div>
      <div class="ds-date-field__grid">
        ${days.map(day => {
          const iso = toISO(day);
          const otherMonth = day.getMonth() !== visibleMonth.getMonth();
          const isToday = today && iso === toISO(today);
          const isSelected = selected && iso === toISO(selected);
          const classes = [
            "ds-date-field__day",
            otherMonth ? "is-other-month" : "",
            isToday ? "is-today" : "",
            isSelected ? "is-selected" : ""
          ].filter(Boolean).join(" ");
          return `<button type="button" class="${classes}" data-date-value="${iso}" aria-label="${iso}" ${isSelected ? 'aria-pressed="true"' : ''}>${day.getDate()}</button>`;
        }).join("")}
      </div>
      <div class="ds-date-field__footer">
        <button type="button" class="ghost" data-date-clear>Limpiar</button>
        <button type="button" class="primary" data-date-today>Hoy</button>
      </div>
    `;

    popover.querySelector("[data-date-prev]").onclick = () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1, 12);
      renderCalendar();
    };
    popover.querySelector("[data-date-next]").onclick = () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12);
      renderCalendar();
    };
    popover.querySelectorAll("[data-date-value]").forEach(dayButton => {
      dayButton.onclick = () => {
        selectedValue = dayButton.dataset.dateValue;
        const chosen = parseISO(selectedValue);
        if (chosen) visibleMonth = new Date(chosen.getFullYear(), chosen.getMonth(), 1, 12);
        updateValue();
        close();
        trigger.focus();
      };
    });
    popover.querySelector("[data-date-clear]").onclick = () => {
      selectedValue = "";
      updateValue();
      close();
      trigger.focus();
    };
    popover.querySelector("[data-date-today]").onclick = () => {
      selectedValue = todayLocalISO();
      const chosen = parseISO(selectedValue);
      visibleMonth = new Date(chosen.getFullYear(), chosen.getMonth(), 1, 12);
      updateValue();
      close();
      trigger.focus();
    };
  }

  function openCalendar() {
    if (open || input.disabled) return;
    open = true;
    wrapper.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    popover.hidden = false;
    renderCalendar();
    document.addEventListener("keydown", onKeydown);
  }

  function close() {
    if (!open) return;
    open = false;
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    popover.hidden = true;
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      trigger.focus();
    }
  }

  trigger.addEventListener("click", openCalendar);
  backdrop.addEventListener("click", close);
  input.addEventListener("change", () => {
    selectedValue = input.value || "";
    updateValue();
  });

  if (input.disabled) wrapper.classList.add("is-disabled");
  updateValue();

  const api = {
    input,
    element: wrapper,
    getValue: () => input.value || "",
    setValue: (nextValue) => {
      selectedValue = nextValue || "";
      const nextDate = parseISO(selectedValue);
      if (nextDate) visibleMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12);
      updateValue();
    },
    open: openCalendar,
    close,
    destroy: () => {
      close();
      wrapper.replaceWith(input);
      input.type = "date";
      input.classList.remove("ds-date-field__input");
      delete input.dataset.dsDateMounted;
      delete input.__dateField;
    }
  };

  input.__dateField = api;
  return api;
}

export function mountDateFields(root = document) {
  const fields = [...root.querySelectorAll('input[type="date"]')];
  return fields.map(input => mountDateField(input, {
    label: input.getAttribute("aria-label") || input.id || "Seleccionar fecha"
  }));
}
