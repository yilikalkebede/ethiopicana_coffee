"use client";

export type AddressInput = {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

export const EMPTY_ADDRESS: AddressInput = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
};

const inputClass = "w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500";
const labelClass = "font-body text-xs text-ink-soft";

export function AddressFields({
  value,
  onChange,
  idPrefix,
}: {
  value: AddressInput;
  onChange: (next: AddressInput) => void;
  idPrefix: string;
}) {
  function set<K extends keyof AddressInput>(key: K, v: AddressInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-firstName`} className={labelClass}>
          First name
        </label>
        <input
          id={`${idPrefix}-firstName`}
          required
          value={value.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-lastName`} className={labelClass}>
          Last name
        </label>
        <input
          id={`${idPrefix}-lastName`}
          required
          value={value.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-address1`} className={labelClass}>
          Address
        </label>
        <input
          id={`${idPrefix}-address1`}
          required
          value={value.address1}
          onChange={(e) => set("address1", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-address2`} className={labelClass}>
          Apartment, suite, etc. (optional)
        </label>
        <input
          id={`${idPrefix}-address2`}
          value={value.address2}
          onChange={(e) => set("address2", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className={labelClass}>
          City
        </label>
        <input
          id={`${idPrefix}-city`}
          required
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-state`} className={labelClass}>
          State / Province
        </label>
        <input
          id={`${idPrefix}-state`}
          required
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-postalCode`} className={labelClass}>
          Postal code
        </label>
        <input
          id={`${idPrefix}-postalCode`}
          required
          value={value.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-country`} className={labelClass}>
          Country
        </label>
        <input
          id={`${idPrefix}-country`}
          required
          value={value.country}
          onChange={(e) => set("country", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
          Phone (optional)
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
    </div>
  );
}
