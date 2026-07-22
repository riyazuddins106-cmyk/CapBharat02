const fs = require('fs');
let content = fs.readFileSync('apps/customer-web/src/app/CustomerApp.tsx', 'utf8');

const featuredOld = `{featuredServices.slice(0, 4).map((service) => (
              <div key={service.id} className="rounded-2xl bg-white border border-black/[0.08] p-3 flex gap-3">
                <div className="w-20 h-20 rounded-xl bg-violet-50 overflow-hidden flex-shrink-0">
                  {service.images?.[0] && <img src={service.images[0]} alt={service.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm">{service.name}</p>
                    {service.badge && <span className="text-[10px] font-bold text-white bg-violet-600 px-2 py-1 rounded-full whitespace-nowrap">{service.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{service.duration} min · ₹{service.customerPrice.toLocaleString("en-IN")}</p>
                  <button onClick={() => onCategorySelect(service.categoryId)} className="mt-2 text-xs font-bold text-violet-600">View service</button>
                </div>
              </div>
            ))}`;

const featuredNew = `{featuredServices.slice(0, 4).map((service) => (
              <div key={service.id} className="relative rounded-2xl bg-white border border-black/[0.05] p-3 flex gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(91,62,245,0.08)] transition-all">
                <div className="w-28 h-28 rounded-xl bg-[#F5F3FF] overflow-hidden flex-shrink-0 relative">
                  {service.images?.[0] ? (
                    <img src={service.images[0]} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EDE9FD] to-[#F5F3FF]">
                      <Sparkles size={24} color="#C4B5FD" />
                    </div>
                  )}
                  {service.badge && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] px-2 py-1 rounded-br-xl text-[10px] font-bold text-white shadow-sm">
                      {service.badge}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-base text-gray-900 leading-tight mb-1 line-clamp-2">{service.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{service.description || "Expert service"}</p>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-sm font-black text-gray-900">₹{service.customerPrice.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {service.duration} min
                      </p>
                    </div>
                    <button 
                      onClick={() => onCategorySelect(service.categoryId)} 
                      className="h-8 px-3 rounded-lg text-xs font-bold text-[#5B3EF5] bg-[#F5F3FF] hover:bg-[#EDE9FD] transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}`;

const catalogOld = `{catalogue.map((service) => (
                <div key={service.id} className="rounded-2xl bg-white border border-black/[0.08] p-3 flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-violet-50 overflow-hidden flex-shrink-0">
                    {service.images?.[0] && <img src={service.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{service.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{service.duration} min{service.description ? \` · \${service.description}\` : ""}</p>
                    <p className="text-sm font-bold text-violet-600 mt-1">₹{service.customerPrice.toLocaleString("en-IN")}</p>
                  </div>
                  <button
                    onClick={() => addToCart(service.id)}
                    disabled={!isLoggedIn}
                    className="self-center px-3 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 disabled:opacity-50"
                  >{isLoggedIn ? "Add" : "Sign in"}</button>
                </div>
              ))}`;

const catalogNew = `{catalogue.map((service) => (
                <div key={service.id} className="group relative rounded-2xl bg-white border border-black/[0.05] p-3 flex gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(91,62,245,0.08)] transition-all">
                  <div className="w-28 h-28 rounded-xl bg-[#F5F3FF] overflow-hidden flex-shrink-0 relative">
                    {service.images?.[0] ? (
                      <img src={service.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EDE9FD] to-[#F5F3FF]">
                        <Sparkles size={24} color="#C4B5FD" />
                      </div>
                    )}
                    {service.badge && (
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] px-2 py-1 rounded-br-xl text-[10px] font-bold text-white shadow-sm">
                        {service.badge}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 leading-tight mb-1 line-clamp-2">{service.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{service.description || "Professional service"}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-sm font-black text-gray-900">₹{service.customerPrice.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {service.duration} min
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(service.id)}
                        disabled={!isLoggedIn}
                        className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 shadow-sm"
                      >
                        {isLoggedIn ? "+ Add" : "Sign in"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}`;

if (content.includes(featuredOld) && content.includes(catalogOld)) {
  content = content.replace(featuredOld, featuredNew).replace(catalogOld, catalogNew);
  fs.writeFileSync('apps/customer-web/src/app/CustomerApp.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find blocks");
  if (!content.includes(featuredOld)) console.log("Missing featuredOld");
  if (!content.includes(catalogOld)) console.log("Missing catalogOld");
}
