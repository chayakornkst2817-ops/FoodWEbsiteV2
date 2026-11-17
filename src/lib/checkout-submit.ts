// Keep navigation and cart clearing strictly after a committed server acknowledgement.
export async function completeCheckout(create:()=>Promise<string>,clearCart:()=>void,navigate:(url:string)=>void) {
 const id=await create();
 clearCart();
 navigate(`/payment/?order=${encodeURIComponent(id)}`);
 return id;
}
